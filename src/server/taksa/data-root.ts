/**
 * Shared data-root resolver for all Taksa ingestion/analysis tooling.
 *
 * Every analyzer and CLI resolves its input/output locations through here so
 * the data root is configured in exactly ONE place. The resolution rule is:
 *
 *   - When `KARMAN_DATA_ROOT` is set in the environment, use it verbatim.
 *   - Otherwise default to `<repo>/data` (i.e. `process.cwd()/data`) for local
 *     development.
 *
 * In production the operator sets `KARMAN_DATA_ROOT=/opt/civilic/data` (a
 * symlink to the real server data path) and runs the CLI against it.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SAFE RELATIVE PATHS
 * ──────────────────────────────────────────────────────────────────────────
 * Absolute filesystem paths (which may reveal server layout) MUST NEVER leak
 * into UI-safe outputs or persisted database metadata. Analyzers compute a
 * "safe relative path" (relative to the data root) via {@link toSafeRelativePath}
 * and only ever persist/return that. The website reads PostgreSQL metadata and
 * therefore only ever sees these relative paths.
 *
 * This module is pure (no DB, no parsing) and trivially unit-testable.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { isAbsolute, join, relative, sep } from "node:path";

/** Production data root the operator points the CLI at (documented, not assumed). */
export const PRODUCTION_DATA_ROOT = "/opt/civilic/data";

/** Real server-side data path that `/opt/civilic/data` symlinks to (documentation only). */
export const REAL_SERVER_DATA_ROOT = "/opt/karman-data/app-data";

/** Folder categories expected under `${dataRoot}/incoming/taksa`. */
export const TAKSA_INCOMING_CATEGORIES = [
  "db",
  "sql",
  "svzt",
  "brvt",
  "psnt",
  "mdb",
  "dts",
  "excel",
  "docs",
  "pdf",
  "rpt",
  "unknown",
] as const;

export type TaksaIncomingCategory = (typeof TAKSA_INCOMING_CATEGORIES)[number];

/** Processed-output sub-directories under `${dataRoot}/processed/taksa`. */
export const TAKSA_PROCESSED_DIRS = [
  "audit",
  "db-audit",
  "scriptxml",
  "sql-static",
  "backup-strings",
  "mdb",
  "excel",
  "docs",
  "pdf",
  "dts",
  "rpt",
] as const;

/**
 * Resolves the effective data root. Honors `KARMAN_DATA_ROOT`; otherwise uses
 * `<cwd>/data`. An explicit `override` (used by tests) wins over both.
 */
export function getDataRoot(override?: string): string {
  if (override && override.length > 0) return override;
  const fromEnv = process.env.KARMAN_DATA_ROOT;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return join(process.cwd(), "data");
}

/** `${dataRoot}/incoming/taksa` — the effective Taksa source directory. */
export function getTaksaIncomingRoot(override?: string): string {
  return join(getDataRoot(override), "incoming", "taksa");
}

/** `${dataRoot}/processed/taksa` — analyzer output root. */
export function getTaksaProcessedRoot(override?: string): string {
  return join(getDataRoot(override), "processed", "taksa");
}

/** A specific processed output directory, e.g. `processed/taksa/audit`. */
export function getTaksaProcessedDir(
  sub: (typeof TAKSA_PROCESSED_DIRS)[number],
  override?: string,
): string {
  return join(getTaksaProcessedRoot(override), sub);
}

/** `${dataRoot}/rejected/taksa` — rejected-input report directory. */
export function getTaksaRejectedRoot(override?: string): string {
  return join(getDataRoot(override), "rejected", "taksa");
}

/** Absolute path of an incoming category folder, e.g. `incoming/taksa/db`. */
export function getTaksaIncomingCategoryDir(
  category: TaksaIncomingCategory,
  override?: string,
): string {
  return join(getTaksaIncomingRoot(override), category);
}

/**
 * Converts an absolute path under the data root into a SAFE relative path
 * (forward-slash normalized, never starting with `..` or an absolute prefix).
 *
 * If the path is somehow outside the data root, only its basename-relative form
 * is returned so an absolute server path can never leak. This is the single
 * choke point that keeps UI-safe outputs free of absolute paths.
 */
export function toSafeRelativePath(absPath: string, override?: string): string {
  const root = getDataRoot(override);
  const rel = relative(root, absPath);
  const normalized = rel.split(sep).join("/");
  if (normalized.startsWith("..") || isAbsolute(normalized) || normalized.length === 0) {
    // Outside the data root (or equal to it): fall back to the trailing segment
    // so we never emit an absolute/escaping path.
    const parts = absPath.split(sep).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1]! : "";
  }
  return normalized;
}

/** True when a string contains no absolute-path prefix (UI-safety assertion helper). */
export function isSafeRelativePath(p: string): boolean {
  if (p.length === 0) return true;
  if (isAbsolute(p)) return false;
  if (p.startsWith("..")) return false;
  // Windows-style absolute (defensive).
  if (/^[A-Za-z]:[\\/]/.test(p)) return false;
  return true;
}
