/**
 * Locale-aware formatting helpers (numerals, currency, dates) for Persian-first
 * UI. Centralized so number/date presentation is consistent and future locales
 * require no component edits.
 *
 * Requirements: 1.2
 */
import type { Decimal } from "decimal.js";

export const DEFAULT_LOCALE = "fa-IR" as const;

/** Formats an integer/number-like for display using Persian (Eastern Arabic) numerals. */
export function formatNumber(value: number | bigint, locale: string = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Formats a monetary `Decimal` for display. The Decimal is converted to a
 * fixed-scale string first to avoid any floating-point coercion, then grouped
 * and localized for presentation only.
 */
export function formatMoney(
  value: Decimal,
  currency = "IRR",
  locale: string = DEFAULT_LOCALE,
): string {
  const [intPart, fracPart] = value.toFixed(2).split(".");
  const grouped = new Intl.NumberFormat(locale).format(BigInt(intPart ?? "0"));
  const frac = fracPart ? new Intl.NumberFormat(locale).format(BigInt(fracPart)) : "";
  const currencyLabel = currency === "IRR" ? "ریال" : currency;
  return frac ? `${grouped}٫${frac} ${currencyLabel}` : `${grouped} ${currencyLabel}`;
}

/** Formats a date for display using the Persian calendar by default. */
export function formatDate(date: Date, locale: string = DEFAULT_LOCALE): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
