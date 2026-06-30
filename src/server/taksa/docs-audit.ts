/**
 * Docs / UI / behavior audit (Phase 2, section L).
 *
 * Parses Taksa UI/behavior config + tips: `gws.ini` (labels + DataPropertyName-
 * like keys), `TAKSA.xml` (safe structural metadata), and `tx_tips*.txt` /
 * `read_msp.txt` (behavior hints). Extracts Persian UI labels, form/grid names,
 * and behavior hints. Tips are HINTS, not official rules — they carry no
 * authority until a later review. No secrets are exposed.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { readTextDetectEncoding, walkFiles, writeCsvFile, writeJsonFile } from "./io";

/** Known Persian (and a few latin) behavior terms to flag in tips/labels. */
export const BEHAVIOR_TERMS = [
  "صورت‌وضعیت",
  "برآورد",
  "پیشنهاد",
  "ریزمتره",
  "تعدیل",
  "شاخص",
  "ضرایب",
  "پایکار",
  "رسیدگی",
  "read-only",
  "انتقال اطلاعات",
] as const;

const PERSIAN = /[\u0600-\u06FF]/;

export interface GwsLabel {
  section: string;
  key: string;
  label: string;
}

export interface DataPropertyName {
  section: string;
  key: string;
  value: string;
}

export interface IniParseResult {
  labels: GwsLabel[];
  dataPropertyNames: DataPropertyName[];
}

/**
 * Pure INI parse. Collects every `key=value` as a (Persian) label candidate and
 * separately captures DataPropertyName-like entries (key contains
 * "DataPropertyName", or value looks like a column/property identifier).
 */
export function parseGwsIni(text: string): IniParseResult {
  const labels: GwsLabel[] = [];
  const dataPropertyNames: DataPropertyName[] = [];
  let section = "";
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith(";") || line.startsWith("#")) continue;
    const sectionMatch = /^\[(.+)\]$/.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1]!;
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (PERSIAN.test(value) || /label|text|caption|title/i.test(key)) {
      labels.push({ section, key, label: value });
    }
    if (/datapropertyname/i.test(key) || /^[A-Za-z_][A-Za-z0-9_]{2,}$/.test(value)) {
      dataPropertyNames.push({ section, key, value });
    }
  }
  return { labels, dataPropertyNames };
}

export interface TaksaXmlSummary {
  rootElement: string | null;
  elementCounts: Record<string, number>;
  attributeNames: string[];
  totalElements: number;
}

/** Pure, value-free structural summary of TAKSA.xml (tag/attribute names only). */
export function parseTaksaXml(text: string): TaksaXmlSummary {
  const tagMatches = Array.from(text.matchAll(/<([A-Za-z_][A-Za-z0-9_.:-]*)\b/g)).map((m) => m[1]!);
  const elementCounts: Record<string, number> = {};
  for (const tag of tagMatches) elementCounts[tag] = (elementCounts[tag] ?? 0) + 1;
  const attributeNames = Array.from(
    new Set(Array.from(text.matchAll(/\b([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*"/g)).map((m) => m[1]!)),
  );
  const rootElement = tagMatches.find((t) => t.toLowerCase() !== "xml") ?? null;
  return {
    rootElement,
    elementCounts,
    attributeNames,
    totalElements: tagMatches.length,
  };
}

export interface BehaviorHint {
  sourceFile: string;
  topic: string;
  text: string;
  matchedTerms: string[];
}

/** Extracts behavior hints (non-empty lines) and flags known behavior terms. */
export function parseBehaviorHints(text: string, sourceFile: string): BehaviorHint[] {
  const topic = sourceFile.toLowerCase().includes("svz")
    ? "svzt"
    : sourceFile.toLowerCase().includes("psn")
      ? "psnt"
      : sourceFile.toLowerCase().includes("msp")
        ? "ms-project"
        : "general";
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((line) => ({
      sourceFile,
      topic,
      text: line.slice(0, 500),
      matchedTerms: BEHAVIOR_TERMS.filter((term) => line.includes(term)),
    }));
}

export interface DocsAuditResult {
  incomingRelative: string;
  gwsLabels: GwsLabel[];
  dataPropertyNames: DataPropertyName[];
  taksaXml: TaksaXmlSummary | null;
  behaviorHints: BehaviorHint[];
  filesParsed: string[];
  totalFiles: number;
}

/** Audits the `docs` folder for UI/behavior metadata. */
export function auditDocs(dataRootOverride?: string): DocsAuditResult {
  const docsDir = getTaksaIncomingCategoryDir("docs", dataRootOverride);
  const walked = walkFiles(docsDir);

  const gwsLabels: GwsLabel[] = [];
  const dataPropertyNames: DataPropertyName[] = [];
  let taksaXml: TaksaXmlSummary | null = null;
  const behaviorHints: BehaviorHint[] = [];
  const filesParsed: string[] = [];

  for (const f of walked) {
    const lower = f.fileName.toLowerCase();
    const { text } = readTextDetectEncoding(f.absPath);
    const rel = toSafeRelativePath(f.absPath, dataRootOverride);
    if (lower.endsWith(".ini")) {
      const parsed = parseGwsIni(text);
      gwsLabels.push(...parsed.labels);
      dataPropertyNames.push(...parsed.dataPropertyNames);
      filesParsed.push(rel);
    } else if (lower.endsWith(".xml")) {
      taksaXml = parseTaksaXml(text);
      filesParsed.push(rel);
    } else if (lower.endsWith(".txt")) {
      behaviorHints.push(...parseBehaviorHints(text, f.fileName));
      filesParsed.push(rel);
    }
  }

  return {
    incomingRelative: toSafeRelativePath(docsDir, dataRootOverride),
    gwsLabels,
    dataPropertyNames,
    taksaXml,
    behaviorHints,
    filesParsed,
    totalFiles: walked.length,
  };
}

/** Writes the docs outputs (summary, labels, property names, hints, xml summary). */
export function writeDocsOutputs(result: DocsAuditResult, dataRootOverride?: string): string[] {
  const dir = getTaksaProcessedDir("docs", dataRootOverride);
  const json = writeJsonFile(dir, "docs_summary.json", {
    incomingRelative: result.incomingRelative,
    filesParsed: result.filesParsed,
    totalFiles: result.totalFiles,
    counts: {
      gwsLabels: result.gwsLabels.length,
      dataPropertyNames: result.dataPropertyNames.length,
      behaviorHints: result.behaviorHints.length,
    },
  });
  const labels = writeCsvFile(dir, "gws_labels.csv", ["section", "key", "label"], result.gwsLabels);
  const props = writeCsvFile(
    dir,
    "data_property_names.csv",
    ["section", "key", "value"],
    result.dataPropertyNames,
  );
  const hints = writeCsvFile(
    dir,
    "behavior_hints.csv",
    ["sourceFile", "topic", "text", "matchedTerms"],
    result.behaviorHints.map((h) => ({ ...h, matchedTerms: h.matchedTerms.join("|") })),
  );
  const xml = writeJsonFile(dir, "taksa_xml_summary.json", result.taksaXml ?? { found: false });
  return [json, labels, props, hints, xml];
}

/** Helper for the docs CLI to find a specific expected file (existence check). */
export function docsFileExists(fileName: string, dataRootOverride?: string): boolean {
  return existsSync(join(getTaksaIncomingCategoryDir("docs", dataRootOverride), fileName));
}
