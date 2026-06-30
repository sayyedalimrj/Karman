/**
 * ScriptXML static PARSER (Phase 2, section G).
 *
 * Statically parses `incoming/taksa/sql/ScriptXML.sql` — the critical Taksa
 * OPENXML import-mapping script — to extract: procedure names, OPENXML usage
 * count, INSERT INTO targets, `/NewDataSet/...` XML paths, and candidate
 * path → target-table mappings (with columns when detectable). It performs NO
 * SQL execution; it only reads text and recognizes structure.
 *
 * Known `/NewDataSet/*` paths are flagged so the later mapping phase can review
 * them. No official values are read or invented.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { readTextDetectEncoding, writeCsvFile, writeJsonFile } from "./io";

/** Known important `/NewDataSet/*` leaf names in Taksa's ScriptXML mapping. */
export const KNOWN_NEWDATASET_PATHS = [
  "base_unit",
  "brv_contract",
  "brv_fhbh",
  "brv_rzmt",
  "brv_TadilKosorat",
  "brv_kosorat",
] as const;

export interface ScriptXmlPath {
  xmlPath: string;
  /** Leaf node name (last path segment). */
  leaf: string;
  known: boolean;
}

export interface ScriptXmlInsertMapping {
  procedureName: string | null;
  targetTable: string;
  xmlPath: string | null;
  columns: string[];
}

export interface ScriptXmlSummary {
  encoding: string;
  procedureNames: string[];
  openXmlCount: number;
  insertTargets: string[];
  xmlPaths: ScriptXmlPath[];
  knownPathsFound: string[];
  mappings: ScriptXmlInsertMapping[];
}

/**
 * Pure parse of ScriptXML text. Recognizes CREATE PROCEDURE names, counts
 * OPENXML occurrences, collects INSERT INTO targets and `/NewDataSet/...` paths,
 * and associates each insert target with the nearest preceding XML path +
 * detectable column list.
 */
export function parseScriptXml(text: string, encoding = "utf-8"): ScriptXmlSummary {
  const procedureNames = Array.from(
    text.matchAll(/CREATE\s+PROC(?:EDURE)?\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/gi),
  ).map((m) => m[1]!);

  const openXmlCount = (text.match(/OPENXML/gi) ?? []).length;

  const insertMatches = Array.from(
    text.matchAll(/INSERT\s+INTO\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?\s*(\(([^)]*)\))?/gi),
  );
  const insertTargets = Array.from(new Set(insertMatches.map((m) => m[1]!)));

  const pathMatches = Array.from(text.matchAll(/\/NewDataSet\/[A-Za-z0-9_/]+/gi)).map(
    (m) => m[0]!,
  );
  const uniquePaths = Array.from(new Set(pathMatches));
  const xmlPaths: ScriptXmlPath[] = uniquePaths.map((p) => {
    const segments = p.split("/").filter(Boolean);
    const leaf = segments[segments.length - 1] ?? "";
    return {
      xmlPath: p,
      leaf,
      known: KNOWN_NEWDATASET_PATHS.some((k) => k.toLowerCase() === leaf.toLowerCase()),
    };
  });
  const knownPathsFound = xmlPaths.filter((p) => p.known).map((p) => p.leaf);

  // Build mappings: for each INSERT INTO, associate the `/NewDataSet/...` path
  // and CREATE PROC name within the same statement. In Taksa's ScriptXML the
  // OPENXML path follows the INSERT (INSERT INTO t ... SELECT ... FROM OPENXML),
  // so we search the statement window (insert → next insert) for the path.
  const mappings: ScriptXmlInsertMapping[] = insertMatches.map((m, i) => {
    const at = m.index ?? 0;
    const nextAt = i + 1 < insertMatches.length ? insertMatches[i + 1]!.index ?? text.length : text.length;
    const before = text.slice(0, at);
    const statementWindow = text.slice(at, nextAt);
    const pathInStatement = statementWindow.match(/\/NewDataSet\/[A-Za-z0-9_/]+/i);
    const pathBefore = before.match(/\/NewDataSet\/[A-Za-z0-9_/]+(?![\s\S]*\/NewDataSet\/)/i);
    const lastProc = Array.from(
      before.matchAll(/CREATE\s+PROC(?:EDURE)?\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/gi),
    ).pop();
    const columns = (m[3] ?? "")
      .split(",")
      .map((c) => c.replace(/[\[\]]/g, "").trim())
      .filter((c) => c.length > 0);
    return {
      procedureName: lastProc ? lastProc[1]! : null,
      targetTable: m[1]!,
      xmlPath: pathInStatement ? pathInStatement[0] : pathBefore ? pathBefore[0] : null,
      columns,
    };
  });

  return {
    encoding,
    procedureNames: Array.from(new Set(procedureNames)),
    openXmlCount,
    insertTargets,
    xmlPaths,
    knownPathsFound: Array.from(new Set(knownPathsFound)),
    mappings,
  };
}

export interface ScriptXmlAuditResult {
  found: boolean;
  relativePath: string | null;
  summary: ScriptXmlSummary | null;
}

/** Locates and parses `ScriptXML.sql` under `incoming/taksa/sql`. */
export function auditScriptXml(dataRootOverride?: string): ScriptXmlAuditResult {
  const sqlDir = getTaksaIncomingCategoryDir("sql", dataRootOverride);
  const candidate = join(sqlDir, "ScriptXML.sql");
  if (!existsSync(candidate)) {
    return { found: false, relativePath: null, summary: null };
  }
  const { text, encoding } = readTextDetectEncoding(candidate);
  return {
    found: true,
    relativePath: toSafeRelativePath(candidate, dataRootOverride),
    summary: parseScriptXml(text, encoding),
  };
}

/** Writes the four ScriptXML outputs. Safe to call with a not-found result. */
export function writeScriptXmlOutputs(
  result: ScriptXmlAuditResult,
  dataRootOverride?: string,
): string[] {
  const dir = getTaksaProcessedDir("scriptxml", dataRootOverride);
  const summary = result.summary;
  const json = writeJsonFile(dir, "scriptxml_summary.json", {
    found: result.found,
    relativePath: result.relativePath,
    summary,
  });
  const paths = writeCsvFile(
    dir,
    "scriptxml_paths.csv",
    ["xmlPath", "leaf", "known"],
    summary?.xmlPaths ?? [],
  );
  const insertMap = writeCsvFile(
    dir,
    "scriptxml_insert_map.csv",
    ["procedureName", "targetTable", "xmlPath", "columns"],
    (summary?.mappings ?? []).map((m) => ({ ...m, columns: m.columns.join("|") })),
  );
  const openXmlMap = writeCsvFile(
    dir,
    "scriptxml_openxml_map.csv",
    ["procedureName", "openXmlCount"],
    [{ procedureName: (summary?.procedureNames ?? []).join("|"), openXmlCount: summary?.openXmlCount ?? 0 }],
  );
  return [json, paths, insertMap, openXmlMap];
}
