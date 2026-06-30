/**
 * Update-package PARSER (admin data-sync).
 *
 * Taksa reference-data updates ship as "update packages" placed on the server
 * under `${taksaRoot}/updates/<PackageName>/…`. Each package contains a
 * `Script.sql` (and an `UpdateScript.exe`). This module DETECTS those packages
 * and STATICALLY PARSES the `Script.sql` to extract INSERT/DELETE *intent* for
 * the known legacy reference tables.
 *
 * HARD SAFETY RULES:
 *  - It NEVER executes `UpdateScript.exe`.
 *  - It NEVER runs destructive SQL — it only reads the script as text.
 *  - It does NOT apply anything: parsed rows become PENDING staging rows with
 *    source provenance. Final canonical apply requires SYSTEM_ADMIN approval
 *    (a later phase).
 *  - It NEVER fabricates official values — only what the real Script.sql
 *    contains is extracted. With no file present it yields an empty (clean)
 *    result, never a user-facing "missing" state.
 *
 * The package `Shakhes(final1404_temp1405)` is recognized as an official
 * incremental reference-data update (final quarterly indices for 1404 plus
 * temporary Q1 1405 index data).
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { getTaksaIncomingRoot, toSafeRelativePath } from "@/server/taksa/data-root";
import { readTextDetectEncoding, sha256OfFile, walkFiles } from "@/server/taksa/io";

/** Legacy Taksa reference tables an update package may touch. */
export const AFFECTED_UPDATE_TABLES = [
  "base_shfs",
  "base_shrs",
  "Base_Fsbs_shkh",
  "base_book",
  "base_book_list",
  "base_NoteGroup",
  "Base_ItemType",
] as const;

/** The recognized official incremental reference-data update package name. */
export const OFFICIAL_INDEX_PACKAGE = "Shakhes(final1404_temp1405)";

/** Parsed INSERT/DELETE intent for a single statement (NOT applied). */
export interface UpdateStagingRow {
  intent: "INSERT" | "DELETE";
  targetTable: string;
  /** Parsed columns/values (INSERT) or where-clause (DELETE); staging-only. */
  rowData: Record<string, unknown> | null;
  /** Safe provenance string (package/script), never an absolute path. */
  provenance: string;
}

export interface ParsedUpdatePackage {
  packageName: string;
  /** SAFE relative path of the package folder. */
  relativePath: string;
  scriptFile: string | null;
  /** Distinct affected legacy tables actually referenced by the script. */
  affectedTables: string[];
  insertIntentCount: number;
  deleteIntentCount: number;
  stagingRows: UpdateStagingRow[];
  /** True when the package is the recognized official index update. */
  recognizedOfficialPackage: boolean;
  checksum: string | null;
  summary: {
    statementCount: number;
    insertIntentCount: number;
    deleteIntentCount: number;
    affectedTables: string[];
    recognizedOfficialPackage: boolean;
  };
}

const KNOWN_TABLE_LC = new Set(AFFECTED_UPDATE_TABLES.map((t) => t.toLowerCase()));

/** Canonicalizes a table token to its known casing when recognized. */
function canonicalTable(raw: string): string | null {
  const lc = raw.toLowerCase();
  if (!KNOWN_TABLE_LC.has(lc)) return null;
  return AFFECTED_UPDATE_TABLES.find((t) => t.toLowerCase() === lc) ?? raw;
}

/** Splits a SQL value list on commas while respecting single-quoted strings. */
function splitValues(list: string): string[] {
  const out: string[] = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < list.length; i++) {
    const ch = list[i]!;
    if (ch === "'") {
      // Handle doubled '' escape inside a string.
      if (inString && list[i + 1] === "'") {
        current += "''";
        i++;
        continue;
      }
      inString = !inString;
      current += ch;
      continue;
    }
    if (ch === "," && !inString) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim().length > 0) out.push(current.trim());
  return out;
}

/**
 * Statically parses an update `Script.sql` text into INSERT/DELETE staging
 * intent for the known legacy tables. Pure (no IO); never executes anything.
 */
export function parseUpdateScript(
  text: string,
  packageName: string,
  relativePath: string,
  scriptFile: string | null,
): Omit<ParsedUpdatePackage, "checksum"> {
  const provenance = `${packageName}${scriptFile ? `/${scriptFile}` : ""}`;
  const rows: UpdateStagingRow[] = [];
  const affected = new Set<string>();

  // INSERT INTO <table> (cols) VALUES (vals)
  const insertRe =
    /INSERT\s+INTO\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?\s*(?:\(([^)]*)\))?\s*VALUES\s*\(([\s\S]*?)\)\s*(?:;|GO|$)/gi;
  for (const m of text.matchAll(insertRe)) {
    const table = canonicalTable(m[1]!);
    if (!table) continue;
    affected.add(table);
    const columns = m[2]
      ? m[2]
          .split(",")
          .map((c) => c.replace(/[\[\]\s]/g, ""))
          .filter(Boolean)
      : [];
    const values = m[3] ? splitValues(m[3]) : [];
    rows.push({
      intent: "INSERT",
      targetTable: table,
      rowData: { columns, values },
      provenance,
    });
  }

  // DELETE FROM <table> [WHERE ...]
  const deleteRe =
    /DELETE\s+FROM\s+(?:\[?dbo\]?\.)?\[?([A-Za-z0-9_]+)\]?\s*([\s\S]*?)(?:;|GO|$)/gi;
  for (const m of text.matchAll(deleteRe)) {
    const table = canonicalTable(m[1]!);
    if (!table) continue;
    affected.add(table);
    const tail = (m[2] ?? "").trim();
    const where = /^WHERE\s+([\s\S]*)$/i.exec(tail)?.[1]?.trim() ?? null;
    rows.push({
      intent: "DELETE",
      targetTable: table,
      rowData: where ? { where } : null,
      provenance,
    });
  }

  const insertIntentCount = rows.filter((r) => r.intent === "INSERT").length;
  const deleteIntentCount = rows.filter((r) => r.intent === "DELETE").length;
  const affectedTables = Array.from(affected).sort();
  const recognizedOfficialPackage =
    packageName.toLowerCase() === OFFICIAL_INDEX_PACKAGE.toLowerCase();

  return {
    packageName,
    relativePath,
    scriptFile,
    affectedTables,
    insertIntentCount,
    deleteIntentCount,
    stagingRows: rows,
    recognizedOfficialPackage,
    summary: {
      statementCount: rows.length,
      insertIntentCount,
      deleteIntentCount,
      affectedTables,
      recognizedOfficialPackage,
    },
  };
}

/** Absolute path of the updates root: `${taksaRoot}/updates`. */
function getUpdatesRoot(dataRootOverride?: string): string {
  return join(getTaksaIncomingRoot(dataRootOverride), "updates");
}

/**
 * Detects update packages under `${taksaRoot}/updates` and parses each
 * package's `Script.sql`. Returns an empty array (clean) when the folder does
 * not exist — analyzers degrade gracefully on an empty local checkout.
 */
export function detectUpdatePackages(dataRootOverride?: string): ParsedUpdatePackage[] {
  const root = getUpdatesRoot(dataRootOverride);
  if (!existsSync(root)) return [];

  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }

  const packages: ParsedUpdatePackage[] = [];
  for (const entry of entries) {
    const pkgDir = join(root, entry);
    let isDir = false;
    try {
      isDir = statSync(pkgDir).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;

    const scriptFile = walkFiles(pkgDir).find(
      (f) => f.fileName.toLowerCase() === "script.sql",
    );
    const relativePath = toSafeRelativePath(pkgDir, dataRootOverride);

    if (!scriptFile) {
      packages.push({
        packageName: entry,
        relativePath,
        scriptFile: null,
        affectedTables: [],
        insertIntentCount: 0,
        deleteIntentCount: 0,
        stagingRows: [],
        recognizedOfficialPackage:
          entry.toLowerCase() === OFFICIAL_INDEX_PACKAGE.toLowerCase(),
        checksum: null,
        summary: {
          statementCount: 0,
          insertIntentCount: 0,
          deleteIntentCount: 0,
          affectedTables: [],
          recognizedOfficialPackage:
            entry.toLowerCase() === OFFICIAL_INDEX_PACKAGE.toLowerCase(),
        },
      });
      continue;
    }

    const { text } = readTextDetectEncoding(scriptFile.absPath);
    const parsed = parseUpdateScript(text, entry, relativePath, scriptFile.fileName);
    packages.push({ ...parsed, checksum: sha256OfFile(scriptFile.absPath) });
  }

  return packages.sort((a, b) => a.packageName.localeCompare(b.packageName));
}
