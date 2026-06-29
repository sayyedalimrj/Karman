/**
 * Schema lint: enforce decimal-only monetary fields.
 *
 * Parses prisma/schema.prisma and flags violations of the decimal-safe money
 * policy, so a monetary field accidentally declared as Integer/Float/BigInt is
 * caught before it reaches the database. Two rules are enforced:
 *
 *   Rule A — every `Decimal` field MUST carry `@db.Decimal(18, 4)`.
 *   Rule B — every field whose NAME denotes money MUST be a `Decimal`
 *            (never Int/Float/BigInt/String/Decimal-without-precision).
 *
 * Exits non-zero on any violation. Run via: `npm run check:decimal`.
 *
 * Requirements: 3.4a (and CP6)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SCHEMA = join(process.cwd(), "prisma/schema.prisma");

// Field-name tokens that denote a monetary amount.
const MONEY_NAME = /(amount|price|cost|fee|payable|deduction|gross|net|balance|subtotal|tax|vat)/i;
// Names that look monetary but are not amounts (allow-list to avoid false positives).
const NOT_MONEY = /^(currency|byteSize|tableOrder|rowOrder|nationalId)$/i;

const REQUIRED_DECIMAL_ATTR = /@db\.Decimal\(\s*18\s*,\s*4\s*\)/;

type Violation = { model: string; field: string; reason: string };

function main(): void {
  const src = readFileSync(SCHEMA, "utf8");
  const lines = src.split("\n");

  const violations: Violation[] = [];
  let model = "";
  let inModel = false;

  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, "").trim();
    if (!line) continue;

    const modelMatch = /^model\s+(\w+)\s*\{/.exec(line);
    if (modelMatch) {
      model = modelMatch[1]!;
      inModel = true;
      continue;
    }
    if (line === "}") {
      inModel = false;
      continue;
    }
    if (!inModel) continue;

    // Field line: `name Type ...attrs`
    const fieldMatch = /^(\w+)\s+([A-Za-z]+)(\[\])?(\?)?\s*(.*)$/.exec(line);
    if (!fieldMatch) continue;
    const [, name, type, , , attrs = ""] = fieldMatch;
    const fieldName = name!;
    const fieldType = type!;

    // Skip relation fields (type is a model name w/ relation attr or list of models).
    const isScalar = /^(String|Int|BigInt|Float|Decimal|Boolean|DateTime|Json|Bytes)$/.test(
      fieldType,
    );
    if (!isScalar) continue;

    // Rule A: Decimal fields must declare precision (18,4).
    if (fieldType === "Decimal" && !REQUIRED_DECIMAL_ATTR.test(attrs)) {
      violations.push({
        model,
        field: fieldName,
        reason: "Decimal field must declare @db.Decimal(18, 4).",
      });
    }

    // Rule B: money-named fields must be Decimal(18,4).
    if (MONEY_NAME.test(fieldName) && !NOT_MONEY.test(fieldName)) {
      if (fieldType !== "Decimal") {
        violations.push({
          model,
          field: fieldName,
          reason: `Monetary field declared as ${fieldType}; must be Decimal @db.Decimal(18, 4).`,
        });
      } else if (!REQUIRED_DECIMAL_ATTR.test(attrs)) {
        violations.push({
          model,
          field: fieldName,
          reason: "Monetary Decimal field must declare @db.Decimal(18, 4).",
        });
      }
    }
  }

  if (violations.length > 0) {
    console.error("[check:decimal] monetary field policy violations:");
    for (const v of violations) {
      console.error(`  - ${v.model}.${v.field}: ${v.reason}`);
    }
    process.exit(1);
  }

  console.log("[check:decimal] OK — all monetary fields are Decimal @db.Decimal(18, 4).");
}

main();
