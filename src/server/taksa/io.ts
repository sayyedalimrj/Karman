/**
 * Shared, dependency-free IO helpers for the Taksa analyzers and CLIs.
 *
 * Centralizes: checksums, encoding-aware text reading (UTF-16/UTF-8), minimal
 * CSV serialization, and writing JSON/CSV/Markdown outputs (creating parent
 * directories as needed). None of these helpers parse official values or
 * mutate inputs — they only read source bytes and write derived analysis
 * artifacts under `data/processed/taksa/`.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/** SHA-256 hex checksum of a buffer/string. */
export function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** SHA-256 hex checksum of a file's bytes. */
export function sha256OfFile(absPath: string): string {
  return sha256(readFileSync(absPath));
}

export type DetectedEncoding = "utf-16le" | "utf-16be" | "utf-8";

export interface DecodedText {
  encoding: DetectedEncoding;
  text: string;
}

/**
 * Reads a text file, detecting UTF-16 (LE/BE, with or without BOM heuristics)
 * vs UTF-8. Taksa SQL scripts are frequently exported as UTF-16; handling both
 * keeps the static parsers robust.
 */
export function readTextDetectEncoding(absPath: string): DecodedText {
  const buf = readFileSync(absPath);
  return decodeTextBuffer(buf);
}

/** Pure decode of a buffer with simple, deterministic encoding detection. */
export function decodeTextBuffer(buf: Buffer): DecodedText {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { encoding: "utf-16le", text: buf.toString("utf16le").replace(/^\uFEFF/, "") };
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // Node has no native utf16be; swap byte pairs then decode as LE.
    const swapped = Buffer.from(buf);
    for (let i = 0; i + 1 < swapped.length; i += 2) {
      const tmp = swapped[i]!;
      swapped[i] = swapped[i + 1]!;
      swapped[i + 1] = tmp;
    }
    return { encoding: "utf-16be", text: swapped.toString("utf16le").replace(/^\uFEFF/, "") };
  }
  // Heuristic: lots of interleaved NUL bytes in the first chunk ⇒ UTF-16LE
  // without BOM (common for exported SQL).
  const sample = buf.subarray(0, Math.min(buf.length, 512));
  let zeros = 0;
  for (let i = 1; i < sample.length; i += 2) if (sample[i] === 0x00) zeros++;
  if (sample.length >= 8 && zeros > sample.length / 4) {
    return { encoding: "utf-16le", text: buf.toString("utf16le").replace(/^\uFEFF/, "") };
  }
  return { encoding: "utf-8", text: buf.toString("utf8").replace(/^\uFEFF/, "") };
}

/** Ensures a directory exists (recursive); returns the path. */
export function ensureDir(dir: string): string {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Escapes a single CSV cell (RFC-4180-ish). */
export function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serializes an array of records to CSV given an explicit, ordered column set. */
export function toCsv<T extends object>(columns: readonly string[], rows: readonly T[]): string {
  const header = columns.map(csvCell).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvCell((row as Record<string, unknown>)[c])).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}

/** Writes a JSON file (pretty-printed) creating parent dirs. */
export function writeJsonFile(dir: string, fileName: string, value: unknown): string {
  ensureDir(dir);
  const full = join(dir, fileName);
  writeFileSync(full, JSON.stringify(value, null, 2) + "\n", "utf8");
  return full;
}

/** Writes a CSV file creating parent dirs. */
export function writeCsvFile<T extends object>(
  dir: string,
  fileName: string,
  columns: readonly string[],
  rows: readonly T[],
): string {
  ensureDir(dir);
  const full = join(dir, fileName);
  writeFileSync(full, toCsv(columns, rows), "utf8");
  return full;
}

/** Writes a plain Markdown/text file creating parent dirs. */
export function writeTextFile(dir: string, fileName: string, text: string): string {
  ensureDir(dir);
  const full = join(dir, fileName);
  writeFileSync(full, text.endsWith("\n") ? text : text + "\n", "utf8");
  return full;
}

export interface WalkedFile {
  /** Absolute path on disk. */
  absPath: string;
  /** File name (basename). */
  fileName: string;
  /** Immediate parent folder name. */
  parentFolder: string;
}

/**
 * Recursively lists files under `root` (skips README.md so the tracked
 * placeholders never appear as ingestion inputs). Returns an empty array when
 * the directory does not exist — analyzers must degrade gracefully on an empty
 * local checkout.
 */
export function walkFiles(root: string): WalkedFile[] {
  if (!existsSync(root)) return [];
  const out: WalkedFile[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        stack.push(full);
      } else if (entry !== "README.md") {
        const parts = dir.split(/[\\/]/).filter(Boolean);
        out.push({ absPath: full, fileName: entry, parentFolder: parts[parts.length - 1] ?? "" });
      }
    }
  }
  return out.sort((a, b) => a.absPath.localeCompare(b.absPath));
}

/** File size in bytes, or 0 when unreadable. */
export function fileSize(absPath: string): number {
  try {
    return statSync(absPath).size;
  } catch {
    return 0;
  }
}

/** File mtime ISO string, or null when unreadable. */
export function fileModifiedAt(absPath: string): string | null {
  try {
    return statSync(absPath).mtime.toISOString();
  } catch {
    return null;
  }
}
