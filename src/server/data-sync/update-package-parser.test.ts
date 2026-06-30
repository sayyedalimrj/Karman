/**
 * Unit tests for the update-package parser.
 *
 * Parses a SYNTHETIC (clearly fake, non-official) Script.sql fixture and
 * asserts it extracts INSERT/DELETE intent for the known legacy tables into
 * staging rows WITH provenance, recognizes the official package name, ignores
 * unknown tables, and never executes anything (it only reads text).
 */
import { describe, it, expect } from "vitest";
import {
  parseUpdateScript,
  AFFECTED_UPDATE_TABLES,
  OFFICIAL_INDEX_PACKAGE,
} from "./update-package-parser";

// SYNTHETIC fixture — fabricated test tokens only; NOT official reference data.
const SYNTHETIC_SCRIPT = `
-- synthetic update package script (test fixture)
INSERT INTO base_book (code, title) VALUES ('TEST-BOOK-1', 'fixture-book');
INSERT INTO [dbo].[base_shfs] (id, label) VALUES (901, 'fixture-shfs');
INSERT INTO Base_Fsbs_shkh (id, period) VALUES (902, 'Q1');
DELETE FROM base_NoteGroup WHERE id = 903;
DELETE FROM Base_ItemType;
INSERT INTO some_other_table (x) VALUES (1);
`;

describe("parseUpdateScript", () => {
  it("extracts INSERT/DELETE intent for known legacy tables only", () => {
    const parsed = parseUpdateScript(
      SYNTHETIC_SCRIPT,
      OFFICIAL_INDEX_PACKAGE,
      "incoming/taksa/updates/Shakhes(final1404_temp1405)",
      "Script.sql",
    );

    // some_other_table is ignored (not a known affected table).
    const tables = parsed.stagingRows.map((r) => r.targetTable);
    expect(tables).not.toContain("some_other_table");

    expect(parsed.insertIntentCount).toBe(3);
    expect(parsed.deleteIntentCount).toBe(2);
    expect(parsed.stagingRows).toHaveLength(5);

    expect(parsed.affectedTables.sort()).toEqual(
      ["Base_Fsbs_shkh", "Base_ItemType", "base_NoteGroup", "base_book", "base_shfs"].sort(),
    );
  });

  it("captures columns/values for INSERT and where-clause for DELETE", () => {
    const parsed = parseUpdateScript(SYNTHETIC_SCRIPT, "pkg", "rel/pkg", "Script.sql");
    const bookInsert = parsed.stagingRows.find(
      (r) => r.intent === "INSERT" && r.targetTable === "base_book",
    );
    expect(bookInsert?.rowData).toMatchObject({ columns: ["code", "title"] });

    const noteDelete = parsed.stagingRows.find(
      (r) => r.intent === "DELETE" && r.targetTable === "base_NoteGroup",
    );
    expect((noteDelete?.rowData as { where?: string })?.where).toContain("id = 903");

    const typeDelete = parsed.stagingRows.find(
      (r) => r.intent === "DELETE" && r.targetTable === "Base_ItemType",
    );
    expect(typeDelete?.rowData).toBeNull(); // no WHERE clause
  });

  it("records safe provenance and never an absolute path", () => {
    const parsed = parseUpdateScript(SYNTHETIC_SCRIPT, "pkg-x", "rel/pkg-x", "Script.sql");
    for (const row of parsed.stagingRows) {
      expect(row.provenance).toBe("pkg-x/Script.sql");
      expect(row.provenance.startsWith("/")).toBe(false);
    }
  });

  it("recognizes the official Shakhes(final1404_temp1405) package name", () => {
    const recognized = parseUpdateScript("", OFFICIAL_INDEX_PACKAGE, "rel", "Script.sql");
    expect(recognized.recognizedOfficialPackage).toBe(true);

    const other = parseUpdateScript("", "SomeOtherPackage", "rel", "Script.sql");
    expect(other.recognizedOfficialPackage).toBe(false);
  });

  it("yields a clean empty result for empty input (no fabricated rows)", () => {
    const parsed = parseUpdateScript("", "pkg", "rel", null);
    expect(parsed.stagingRows).toEqual([]);
    expect(parsed.insertIntentCount).toBe(0);
    expect(parsed.deleteIntentCount).toBe(0);
    expect(parsed.affectedTables).toEqual([]);
  });

  it("knows the full set of affected legacy tables", () => {
    expect(AFFECTED_UPDATE_TABLES).toContain("base_shfs");
    expect(AFFECTED_UPDATE_TABLES).toContain("base_shrs");
    expect(AFFECTED_UPDATE_TABLES).toContain("Base_Fsbs_shkh");
    expect(AFFECTED_UPDATE_TABLES).toContain("base_book");
    expect(AFFECTED_UPDATE_TABLES).toContain("base_book_list");
    expect(AFFECTED_UPDATE_TABLES).toContain("base_NoteGroup");
    expect(AFFECTED_UPDATE_TABLES).toContain("Base_ItemType");
  });
});
