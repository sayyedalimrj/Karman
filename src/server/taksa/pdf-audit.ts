/**
 * PDF metadata audit (Phase 2, section M).
 *
 * For provenance PDFs under `incoming/taksa/pdf`: lists each file with size,
 * checksum, page count (when detectable from the PDF structure), and document
 * title (from the Info dictionary, when present), then classifies by file-name
 * keywords. There is NO OCR, NO numeric extraction, and NO automatic official
 * import — PDFs are provenance, never a data source.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { readFileSync } from "node:fs";
import { getTaksaIncomingCategoryDir, getTaksaProcessedDir, toSafeRelativePath } from "./data-root";
import { fileSize, sha256OfFile, walkFiles, writeCsvFile, writeJsonFile } from "./io";

/** Filename keyword → classification (Persian construction-document topics). */
export const PDF_KEYWORDS: ReadonlyArray<{ term: string; label: string }> = [
  { term: "فهرست‌بها", label: "price-list" },
  { term: "فهرست بها", label: "price-list" },
  { term: "مغایرت", label: "discrepancy" },
  { term: "تعدیل", label: "adjustment" },
  { term: "مالیات", label: "tax" },
  { term: "پیمان", label: "contract" },
  { term: "تضمین", label: "guarantee" },
  { term: "ضرایب", label: "coefficients" },
  { term: "تجهیز", label: "mobilization" },
  { term: "جبران ارز", label: "currency-compensation" },
];

/** Detects the page count from PDF structure (metadata only, no rendering). */
export function detectPdfPageCount(buf: Buffer): number | null {
  const text = buf.toString("latin1");
  const pageObjs = (text.match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
  if (pageObjs > 0) return pageObjs;
  const countMatch = /\/Count\s+(\d+)/.exec(text);
  return countMatch ? Number(countMatch[1]) : null;
}

/** Extracts the document title from the Info dictionary, when present. */
export function detectPdfTitle(buf: Buffer): string | null {
  const text = buf.toString("latin1");
  const m = /\/Title\s*\(([^)]{0,200})\)/.exec(text);
  return m ? m[1]!.trim() : null;
}

/** Classifies a PDF by file-name keywords (may match several topics). */
export function classifyPdf(fileName: string): string[] {
  return PDF_KEYWORDS.filter((k) => fileName.includes(k.term)).map((k) => k.label);
}

export interface PdfFileResult {
  relativePath: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  pageCount: number | null;
  title: string | null;
  classifications: string[];
  isPdf: boolean;
}

export interface PdfAuditResult {
  incomingRelative: string;
  files: PdfFileResult[];
  totalFiles: number;
}

/** Audits the `pdf` folder for metadata (no OCR / no numeric extraction). */
export function auditPdf(dataRootOverride?: string): PdfAuditResult {
  const pdfDir = getTaksaIncomingCategoryDir("pdf", dataRootOverride);
  const walked = walkFiles(pdfDir);
  const files = walked.map((f) => {
    const buf = readFileSync(f.absPath);
    const isPdf = buf.subarray(0, 5).toString("latin1") === "%PDF-";
    return {
      relativePath: toSafeRelativePath(f.absPath, dataRootOverride),
      fileName: f.fileName,
      sizeBytes: fileSize(f.absPath),
      checksum: sha256OfFile(f.absPath),
      pageCount: isPdf ? detectPdfPageCount(buf) : null,
      title: isPdf ? detectPdfTitle(buf) : null,
      classifications: classifyPdf(f.fileName),
      isPdf,
    };
  });
  return {
    incomingRelative: toSafeRelativePath(pdfDir, dataRootOverride),
    files,
    totalFiles: files.length,
  };
}

/** Writes the PDF outputs (summary + inventory CSV). */
export function writePdfOutputs(result: PdfAuditResult, dataRootOverride?: string): string[] {
  const dir = getTaksaProcessedDir("pdf", dataRootOverride);
  const json = writeJsonFile(dir, "pdf_summary.json", result);
  const inventory = writeCsvFile(
    dir,
    "pdf_inventory.csv",
    ["relativePath", "fileName", "sizeBytes", "checksum", "pageCount", "title", "classifications"],
    result.files.map((f) => ({
      ...f,
      title: f.title ?? "",
      pageCount: f.pageCount ?? "",
      classifications: f.classifications.join("|"),
    })),
  );
  return [json, inventory];
}
