/**
 * Safe `next` redirect-target handling.
 *
 * Only same-origin relative paths are accepted. This prevents open-redirect
 * attacks via the `?next=` query parameter on the login flow: an attacker must
 * not be able to bounce an authenticated user to an external origin.
 *
 * Rules — a value is accepted ONLY if it:
 *   - is a non-empty string,
 *   - starts with a single "/" (relative path),
 *   - does NOT start with "//" or "/\\" (protocol-relative URL),
 *   - contains no control characters.
 * Anything else falls back to the provided default ("/dashboard").
 */
export const DEFAULT_NEXT_PATH = "/dashboard";

export function sanitizeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_NEXT_PATH,
): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  // Must be a root-relative path.
  if (raw[0] !== "/") return fallback;
  // Reject protocol-relative ("//host") and backslash tricks ("/\\host").
  if (raw[1] === "/" || raw[1] === "\\") return fallback;
  // Reject control characters and whitespace that could be used to smuggle.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(raw)) return fallback;
  return raw;
}
