/**
 * i18n entry point. Persian-first; the structure allows additional locales to
 * be registered later without changing component call sites.
 *
 * Requirements: 1.2
 */
import { fa, type Messages } from "./strings";

export type Locale = "fa";

export const defaultLocale: Locale = "fa";

const catalogs: Record<Locale, Messages> = { fa };

/** Returns the message catalog for the given locale (defaults to Persian). */
export function getMessages(locale: Locale = defaultLocale): Messages {
  return catalogs[locale] ?? catalogs[defaultLocale];
}

/** Convenience accessor for the default (Persian) catalog. */
export const t: Messages = getMessages(defaultLocale);

export { fa } from "./strings";
export type { Messages } from "./strings";
export {
  DEFAULT_LOCALE,
  formatNumber,
  formatMoney,
  formatDate,
} from "./format";
