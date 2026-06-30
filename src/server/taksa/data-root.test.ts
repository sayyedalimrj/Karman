/**
 * Unit tests for the Taksa data-root resolver (DB-free, pure).
 *
 * Confirms default-local resolution, KARMAN_DATA_ROOT override, the effective
 * incoming path, and that no absolute path can leak through the safe-relative
 * conversion.
 *
 * Requirements (Phase 2): server-aware Taksa ingestion + analysis infrastructure.
 */
import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import {
  getDataRoot,
  getTaksaIncomingRoot,
  toSafeRelativePath,
  isSafeRelativePath,
} from "./data-root";

const ORIGINAL = process.env.KARMAN_DATA_ROOT;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.KARMAN_DATA_ROOT;
  else process.env.KARMAN_DATA_ROOT = ORIGINAL;
});

describe("getDataRoot", () => {
  it("defaults to <cwd>/data when KARMAN_DATA_ROOT is unset", () => {
    delete process.env.KARMAN_DATA_ROOT;
    expect(getDataRoot()).toBe(join(process.cwd(), "data"));
  });

  it("honors the KARMAN_DATA_ROOT override", () => {
    process.env.KARMAN_DATA_ROOT = "/opt/civilic/data";
    expect(getDataRoot()).toBe("/opt/civilic/data");
    expect(getTaksaIncomingRoot()).toBe("/opt/civilic/data/incoming/taksa");
  });

  it("prefers an explicit override argument over the env var", () => {
    process.env.KARMAN_DATA_ROOT = "/opt/civilic/data";
    expect(getDataRoot("/tmp/custom")).toBe("/tmp/custom");
  });
});

describe("toSafeRelativePath — no absolute-path leakage", () => {
  it("returns a data-root-relative, forward-slash path", () => {
    const root = "/opt/karman-data/app-data";
    const abs = `${root}/incoming/taksa/sql/ScriptXML.sql`;
    const rel = toSafeRelativePath(abs, root);
    expect(rel).toBe("incoming/taksa/sql/ScriptXML.sql");
    expect(isSafeRelativePath(rel)).toBe(true);
  });

  it("never emits an absolute path even when the input escapes the root", () => {
    const rel = toSafeRelativePath("/etc/passwd", "/opt/karman-data/app-data");
    expect(isSafeRelativePath(rel)).toBe(true);
    expect(rel.startsWith("/")).toBe(false);
    expect(rel).toBe("passwd");
  });

  it("isSafeRelativePath rejects absolute and escaping paths", () => {
    expect(isSafeRelativePath("/opt/civilic/data/x")).toBe(false);
    expect(isSafeRelativePath("../secret")).toBe(false);
    expect(isSafeRelativePath("C:\\Windows")).toBe(false);
    expect(isSafeRelativePath("incoming/taksa/db/x.DB")).toBe(true);
  });
});
