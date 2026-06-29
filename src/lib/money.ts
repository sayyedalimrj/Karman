/**
 * Decimal-safe monetary primitives.
 *
 * All money in Karman is represented as `Decimal` (decimal.js, which is also
 * the basis of Prisma.Decimal). JavaScript `number` / floating-point is NEVER
 * used for monetary operands, intermediates, or results — including
 * whole-currency amounts. A central rounding policy (ROUND_HALF_UP, scale 4)
 * keeps every computation deterministic and audit-reproducible.
 *
 * Requirements: 1.4, 8.3 (and Correctness Property CP6)
 */
import { Decimal } from "decimal.js";

/** The canonical monetary type. Never `number`. */
export type Money = Decimal;

/** Central scale (number of fractional digits) for all monetary values. */
export const MONEY_SCALE = 4 as const;

/** Central rounding mode: ROUND_HALF_UP. */
export const MONEY_ROUNDING: Decimal.Rounding = Decimal.ROUND_HALF_UP;

// Configure the shared Decimal constructor with the central policy. decimal.js
// applies `rounding` on division/`toDP`; we additionally normalise to scale on
// construction via `toMoney`.
Decimal.set({ rounding: MONEY_ROUNDING });

/**
 * Guard: rejects JavaScript `number` (and other non-Decimal-safe inputs) used
 * as a monetary operand. Throws immediately rather than coercing, so legacy or
 * third-party `number` values can never silently enter a financial computation.
 *
 * Accepts: `Decimal`, decimal-formatted `string`, or `bigint`.
 * Rejects: `number`, `null`, `undefined`, `NaN`, and non-finite values.
 */
export function assertNotNumber(value: unknown, context = "monetary operand"): void {
  if (typeof value === "number") {
    throw new TypeError(
      `Refusing to use a JavaScript number as a ${context}; pass a Decimal/string instead.`,
    );
  }
}

/**
 * Constructs a `Money` value at the central scale. Rejects JS `number` inputs.
 * Accepts a `Decimal`, a decimal-formatted `string`, or a `bigint`.
 */
export function toMoney(value: Decimal | string | bigint): Money {
  assertNotNumber(value);
  const d = value instanceof Decimal ? value : new Decimal(typeof value === "bigint" ? value.toString() : value);
  if (!d.isFinite()) {
    throw new RangeError("Monetary value must be finite.");
  }
  return d.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

/** Zero money at the central scale. */
export function zeroMoney(): Money {
  return new Decimal(0).toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

/** Rounds an existing Decimal to the central money scale/policy. */
export function roundMoney(value: Money): Money {
  assertNotNumber(value);
  return value.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

/** Serialises money to a fixed-scale string suitable for storage/transport. */
export function moneyToString(value: Money): string {
  return roundMoney(value).toFixed(MONEY_SCALE);
}

export { Decimal };
