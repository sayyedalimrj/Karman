/**
 * SQL / SCP static PARSER (Phase 2, section H).
 *
 * Statically parses Taksa SQL/SCP scripts (`myscr.sql`, `ScriptConst.sql`,
 * `prj*.scp`, …) WITHOUT executing anything. Handles UTF-16 and UTF-8. Extracts
 * CREATE TABLE names + columns (when detectable), ALTER TABLE relationships,
 * PK/FK candidates, CREATE PROCEDURE/VIEW names, INSERT targets, domain keyword
 * hit counts, and a DETECTION-ONLY dangerous-SQL report.
 *
 * Detecting a dangerous keyword (DROP/ALTER/EXEC/…) NEVER runs it — the report
 * exists purely so a human reviewer can see what the script would do.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { extname } from "node:path";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { readTextDetectEncoding, walkFiles, writeCsvFile, writeJsonFile } from "./io";

/** Domain keyword fragments counted across each script. */
export const DOMAIN_KEYWORDS = [
  "base_",
  "brv",
  "svz",
  "psn",
  "contract",
  "shakhes",
  "shkh",
  "tadil",
  "rzmt",
  "fhbh",
  "unit",
  "sorc",
  "kosorat",
  "zarib",
] as const;

/** Dangerous SQL tokens — detected only, NEVER executed. */
export const DANGEROUS_KEYWORDS = [
  "DROP",
  "ALTER",
  "EXECUTE",
  "EXEC",
  "TRUNCATE",
  "DELETE",
  "UPDATE",
  "xp_",
  "sp_",
] as const;

export interface SqlTable {
  table: string;
  columns: string[];
}

export interface SqlRelationship {
  fromTable: string;
  toTable: string | null;
  kind: "ALTER" | "FK";
}

export interface SqlStaticFileSummary {
  relativePath: string;
  fileName: string;
  encoding: string;
  tables: SqlTable[];
  alterRelationships: SqlRelationship[];
  primaryKeyCandidates: string[];
  foreignKeyCandidates: string[];
  procedures: string[];
  views: string[];
  insertTargets: string[];
  keywordHits: Record<string, number>;
  dangerousHits: Record<string, number>;
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

/** Pure static parse of a single SQL/SCP script's text. */
export function parseStaticSql(
  text: string,
  fileName: string,
  relativePath: string,
  encoding = "utf-8",
): SqlStaticFileSummary {
  const lower = text.toLowerCase();

  const tables: SqlTable[] = Array.from(
    text.matchAll(/CREATE\s+TABLE\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?\s*\(([\s\S]*?)\)\s*(?:;|GO|$)/gi),
  ).map((m) => {
    const table = m[1]!;
    const body = m[2] ?? "";
    const columns = body
      .split(/,(?![^(]*\))/)
      .map((line) => line.trim())
      .map((line) => /^\[?([A-Za-z0-9_]+)\]?\s+/.exec(line)?.[1])
      .filter((c): c is string => Boolean(c) && !/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|KEY|CHECK)$/i.test(c!));
    return { table, columns };
  });

  const alterRelationships: SqlRelationship[] = Array.from(
    text.matchAll(/ALTER\s+TABLE\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?([\s\S]*?)(?:;|GO|$)/gi),
  ).map((m) => {
    const ref = /REFERENCES\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/i.exec(m[2] ?? "");
    return {
      fromTable: m[1]!,
      toTable: ref ? ref[1]! : null,
      kind: /FOREIGN\s+KEY/i.test(m[2] ?? "") ? ("FK" as const) : ("ALTER" as const),
    };
  });

  const primaryKeyCandidates = Array.from(
    text.matchAll(/PRIMARY\s+KEY\s*\(([^)]*)\)/gi),
  ).map((m) => m[1]!.replace(/[\[\]\s]/g, ""));

  const foreignKeyCandidates = Array.from(
    text.matchAll(/FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/gi),
  ).map((m) => `${m[1]!.replace(/[\[\]\s]/g, "")}->${m[2]!}`);

  const procedures = Array.from(
    text.matchAll(/CREATE\s+PROC(?:EDURE)?\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/gi),
  ).map((m) => m[1]!);

  const views = Array.from(
    text.matchAll(/CREATE\s+VIEW\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/gi),
  ).map((m) => m[1]!);

  const insertTargets = Array.from(
    text.matchAll(/INSERT\s+INTO\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?/gi),
  ).map((m) => m[1]!);

  const keywordHits: Record<string, number> = {};
  for (const kw of DOMAIN_KEYWORDS) keywordHits[kw] = countOccurrences(lower, kw.toLowerCase());

  const dangerousHits: Record<string, number> = {};
  for (const kw of DANGEROUS_KEYWORDS) {
    const re = new RegExp(`\\b${kw.replace(/[_]/g, "_")}`, "gi");
    dangerousHits[kw] = (text.match(re) ?? []).length;
  }

  return {
    relativePath,
    fileName,
    encoding,
    tables,
    alterRelationships,
    primaryKeyCandidates: Array.from(new Set(primaryKeyCandidates)),
    foreignKeyCandidates: Array.from(new Set(foreignKeyCandidates)),
    procedures: Array.from(new Set(procedures)),
    views: Array.from(new Set(views)),
    insertTargets: Array.from(new Set(insertTargets)),
    keywordHits,
    dangerousHits,
  };
}

export interface SqlStaticAuditResult {
  incomingRelative: string;
  files: SqlStaticFileSummary[];
  totalFiles: number;
}

/** Scans the `sql` folder for .sql/.scp scripts (excluding ScriptXML.sql). */
export function auditStaticSql(dataRootOverride?: string): SqlStaticAuditResult {
  const sqlDir = getTaksaIncomingCategoryDir("sql", dataRootOverride);
  const walked = walkFiles(sqlDir).filter((f) => {
    const ext = extname(f.fileName).toLowerCase();
    return (ext === ".sql" || ext === ".scp") && f.fileName.toLowerCase() !== "scriptxml.sql";
  });
  const files = walked.map((f) => {
    const { text, encoding } = readTextDetectEncoding(f.absPath);
    return parseStaticSql(text, f.fileName, toSafeRelativePath(f.absPath, dataRootOverride), encoding);
  });
  return {
    incomingRelative: toSafeRelativePath(sqlDir, dataRootOverride),
    files,
    totalFiles: files.length,
  };
}

/** Writes the six static-SQL outputs. */
export function writeStaticSqlOutputs(
  result: SqlStaticAuditResult,
  dataRootOverride?: string,
): string[] {
  const dir = getTaksaProcessedDir("sql-static", dataRootOverride);
  const json = writeJsonFile(dir, "static_sql_summary.json", result);

  const tableRows = result.files.flatMap((f) =>
    f.tables.map((t) => ({ file: f.fileName, table: t.table, columnCount: t.columns.length })),
  );
  const tables = writeCsvFile(dir, "static_sql_tables.csv", ["file", "table", "columnCount"], tableRows);

  const columnRows = result.files.flatMap((f) =>
    f.tables.flatMap((t) => t.columns.map((c) => ({ file: f.fileName, table: t.table, column: c }))),
  );
  const columns = writeCsvFile(dir, "static_sql_columns.csv", ["file", "table", "column"], columnRows);

  const moduleRows = result.files.flatMap((f) => [
    ...f.procedures.map((p) => ({ file: f.fileName, kind: "PROCEDURE", name: p })),
    ...f.views.map((v) => ({ file: f.fileName, kind: "VIEW", name: v })),
  ]);
  const modules = writeCsvFile(dir, "static_sql_modules.csv", ["file", "kind", "name"], moduleRows);

  const keywordRows = result.files.flatMap((f) =>
    Object.entries(f.keywordHits).map(([keyword, count]) => ({ file: f.fileName, keyword, count })),
  );
  const keywordHits = writeCsvFile(
    dir,
    "static_sql_keyword_hits.csv",
    ["file", "keyword", "count"],
    keywordRows,
  );

  const dangerousRows = result.files.flatMap((f) =>
    Object.entries(f.dangerousHits)
      .filter(([, count]) => count > 0)
      .map(([keyword, count]) => ({ file: f.fileName, keyword, count })),
  );
  const dangerous = writeCsvFile(
    dir,
    "static_sql_dangerous_keywords.csv",
    ["file", "keyword", "count"],
    dangerousRows,
  );

  return [json, tables, columns, modules, keywordHits, dangerous];
}
