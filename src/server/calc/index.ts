/**
 * Decimal-safe calculation engine.
 *
 * Every monetary computation uses `Decimal` (decimal.js / Prisma.Decimal) — a
 * JavaScript `number` is NEVER accepted as a monetary operand. Each public
 * function guards its inputs with `assertNotNumber` and throws a `TypeError`
 * immediately if a `number` is supplied, so float artifacts can never enter a
 * financial result. Results are normalised to the central rounding policy
 * (ROUND_HALF_UP, scale 4). No `parseFloat` / `Number` / JS float arithmetic is
 * used anywhere here.
 *
 * Requirements: 8.1, 8.2, 8.3 (and Correctness Property CP6)
 */
import {
  type Decimal,
  type Money,
  assertNotNumber,
  roundMoney,
  zeroMoney,
} from "@/lib/money";

/**
 * Sums a list of monetary values with decimal arithmetic.
 *
 * @throws TypeError if any element is a JS `number`.
 * @returns Σ values at the central scale/rounding; `0` for an empty list.
 */
export function sum(values: Money[]): Money {
  let total = zeroMoney();
  for (const value of values) {
    assertNotNumber(value, "summand");
    total = total.plus(value);
  }
  return roundMoney(total);
}

/**
 * Applies a percentage (expressed as a fraction, e.g. `0.1` for 10%) to a base
 * amount using decimal arithmetic.
 *
 * @throws TypeError if `base` or `percent` is a JS `number`.
 * @returns `base * percent` at the central scale/rounding.
 */
export function applyPercentage(base: Money, percent: Decimal): Money {
  assertNotNumber(base, "base amount");
  assertNotNumber(percent, "percentage");
  return roundMoney(base.times(percent));
}

/**
 * Computes the net amount after subtracting all deductions from a gross amount.
 *
 * @throws TypeError if `gross` or any deduction is a JS `number`.
 * @returns `gross - Σ deductions` at the central scale/rounding.
 */
export function netAfterDeductions(gross: Money, deductions: Money[]): Money {
  assertNotNumber(gross, "gross amount");
  const totalDeductions = sum(deductions);
  return roundMoney(gross.minus(totalDeductions));
}
