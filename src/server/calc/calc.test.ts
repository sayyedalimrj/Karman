/**
 * Unit + property tests for the decimal-safe calculation engine (DB-free).
 *
 * Property CP6: Financial values never use floating-point arithmetic.
 * **Validates: Requirements 8.1, 8.2, 8.3**
 *
 * The properties assert engine outputs equal independently decimal-computed
 * expectations under the central ROUND_HALF_UP scale-4 policy, and that
 * supplying a JS `number` operand throws a TypeError.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { Decimal, MONEY_ROUNDING, MONEY_SCALE, toMoney } from "@/lib/money";
import { applyPercentage, netAfterDeductions, sum } from "./index";

/** Generates a decimal-money string like "-12345.6789" (no JS float involved). */
const moneyStringArb = fc
  .tuple(
    fc.boolean(),
    fc.bigInt({ min: 0n, max: 9_999_999_999n }),
    fc.integer({ min: 0, max: 9999 }),
  )
  .map(([neg, whole, frac]) => {
    const fracStr = frac.toString().padStart(4, "0");
    return `${neg ? "-" : ""}${whole.toString()}.${fracStr}`;
  });

const moneyArb = moneyStringArb.map((s) => toMoney(s));

function expectedSum(values: Decimal[]): Decimal {
  let acc = new Decimal(0);
  for (const v of values) acc = acc.plus(v);
  return acc.toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
}

describe("sum", () => {
  it("returns zero for an empty list", () => {
    expect(sum([]).toFixed(MONEY_SCALE)).toBe("0.0000");
  });

  it("adds known values exactly (no float drift)", () => {
    // 0.1 + 0.2 must be exactly 0.3 under decimal arithmetic.
    expect(sum([toMoney("0.1"), toMoney("0.2")]).toFixed(MONEY_SCALE)).toBe("0.3000");
  });

  it("throws TypeError when any summand is a JS number", () => {
    // @ts-expect-error intentional misuse for the guard test
    expect(() => sum([toMoney("1"), 2])).toThrow(TypeError);
  });
});

describe("applyPercentage", () => {
  it("computes a percentage with decimal precision", () => {
    expect(applyPercentage(toMoney("200"), new Decimal("0.1")).toFixed(MONEY_SCALE)).toBe(
      "20.0000",
    );
  });

  it("applies ROUND_HALF_UP at scale 4", () => {
    // 1.00005 → rounds half up to 1.0001 at scale 4.
    expect(applyPercentage(toMoney("1.0000"), new Decimal("1.00005")).toFixed(MONEY_SCALE)).toBe(
      "1.0001",
    );
  });

  it("throws TypeError when base is a JS number", () => {
    // @ts-expect-error intentional misuse for the guard test
    expect(() => applyPercentage(1000, new Decimal("0.1"))).toThrow(TypeError);
  });

  it("throws TypeError when percent is a JS number", () => {
    // @ts-expect-error intentional misuse for the guard test
    expect(() => applyPercentage(toMoney("1000"), 0.1)).toThrow(TypeError);
  });
});

describe("netAfterDeductions", () => {
  it("subtracts all deductions from gross", () => {
    expect(
      netAfterDeductions(toMoney("1000"), [toMoney("100"), toMoney("50.25")]).toFixed(MONEY_SCALE),
    ).toBe("849.7500");
  });

  it("throws TypeError when gross is a JS number", () => {
    // @ts-expect-error intentional misuse for the guard test
    expect(() => netAfterDeductions(1000, [toMoney("1")])).toThrow(TypeError);
  });

  it("throws TypeError when a deduction is a JS number", () => {
    // @ts-expect-error intentional misuse for the guard test
    expect(() => netAfterDeductions(toMoney("1000"), [5])).toThrow(TypeError);
  });
});

describe("CP6 — decimal-safe computation (property)", () => {
  it("sum equals the decimal-computed expectation", () => {
    fc.assert(
      fc.property(fc.array(moneyArb, { maxLength: 25 }), (values) => {
        expect(sum(values).toFixed(MONEY_SCALE)).toBe(expectedSum(values).toFixed(MONEY_SCALE));
      }),
    );
  });

  it("netAfterDeductions equals gross minus decimal-summed deductions", () => {
    fc.assert(
      fc.property(moneyArb, fc.array(moneyArb, { maxLength: 25 }), (gross, deductions) => {
        const expected = gross
          .minus(expectedSum(deductions))
          .toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
        expect(netAfterDeductions(gross, deductions).toFixed(MONEY_SCALE)).toBe(
          expected.toFixed(MONEY_SCALE),
        );
      }),
    );
  });

  it("applyPercentage equals base*percent under the central rounding policy", () => {
    fc.assert(
      fc.property(moneyArb, moneyStringArb, (base, percentStr) => {
        const percent = new Decimal(percentStr);
        const expected = base.times(percent).toDecimalPlaces(MONEY_SCALE, MONEY_ROUNDING);
        expect(applyPercentage(base, percent).toFixed(MONEY_SCALE)).toBe(
          expected.toFixed(MONEY_SCALE),
        );
      }),
    );
  });

  it("rejects JS number operands (no float can enter a computation)", () => {
    fc.assert(
      fc.property(fc.double(), (n) => {
        // @ts-expect-error intentional misuse for the guard test
        expect(() => sum([n])).toThrow(TypeError);
      }),
    );
  });
});
