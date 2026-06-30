/**
 * File discovery + parsing for the canonical reference importer.
 *
 * Discovers `<kind>.json` / `<kind>.csv` files in the incoming directory and
 * parses them into plain record arrays. No validation happens here (see
 * index.ts); discovery never invents data and fails clearly when the incoming
 * directory is absent.
 *
 * Requirements: 15.2, 15.6
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { REFERENCE_FILE_KINDS, type ReferenceFileKind } from "./schemas";

/** Default incoming directory (git-ignored except README). */
export const DEFAULT_INCOMING_DIR = join(process.cwd(), "data/incoming/reference");

/** Integer-typed fields (used to coerce CSV string cells to numbers). */
const INTEGER_FIELDS = new Set(["effectiveYear", "order", "year", "quarter", "month"]);

export type FileFormat = "json" | "csv";

export interface DiscoveredFile {
  kind: ReferenceFileKind;
  format: FileFormat;
  path: string;
}

/** Lists canonical reference files present in the incoming directory. */
export function discoverReferenceFiles(dir: string = DEFAULT_INCOMING_DIR): DiscoveredFile[] {
  if (!existsSync(dir)) return [];
  const present = new Set(readdirSync(dir));
  const found: DiscoveredFile[] = [];
  for (const kind of REFERENCE_FILE_KINDS) {
    for (const format of ["json", "csv"] as const) {
      const fileName = `${kind}.${format}`;
      if (present.has(fileName)) {
        found.push({ kind, format, path: join(dir, fileName) });
      }
    }
  }
  return found;
}

/** Minimal CSV parser: header row + comma-separated values with "" quoting. */
export function parseCsv(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      const raw = cells[i] ?? "";
      row[h] = INTEGER_FIELDS.has(h) && raw !== "" ? Number(raw) : raw;
    });
    return row;
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/** Parses a discovered file into a record array (JSON array or CSV rows). */
export function parseReferenceFile(file: DiscoveredFile): Record<string, unknown>[] {
  const text = readFileSync(file.path, "utf8");
  if (file.format === "json") {
    const parsed = JSON.parse(text) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`Reference file ${file.path} must contain a JSON array of records.`);
    }
    return parsed as Record<string, unknown>[];
  }
  return parseCsv(text);
}
