/**
 * Typed domain errors with consistent transport (HTTP) mapping.
 *
 * The domain/service layer throws these typed errors; the transport boundary
 * (Route Handlers / Server Actions) maps them to HTTP status codes and safe
 * UX messages. Errors never leak secrets or stack traces to clients in
 * production — full detail is logged server-side.
 *
 * Requirements: 4.6 (and the error-handling table in design.md)
 */

/** Machine-readable error codes, stable across transports. */
export type DomainErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "WORKFLOW"
  | "LOCKED"
  | "VALIDATION";

/**
 * Base class for all domain errors. Carries an HTTP `status` and a stable
 * `code` so the transport layer can map errors uniformly.
 */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
  abstract readonly status: number;

  /** Optional non-sensitive structured context for logs / field-level UX. */
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    // Restore prototype chain when targeting ES2022 + transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** No / invalid session. Transport: 401 → redirect to Login. */
export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED" as const;
  readonly status = 401;
  constructor(message = "احراز هویت نشده است.", details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Role / membership denies the action. Transport: 403 → inline "no permission". */
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN" as const;
  readonly status = 403;
  constructor(message = "دسترسی مجاز نیست.", details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Entity missing or not visible to the user. Transport: 404 → not-found state. */
export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND" as const;
  readonly status = 404;
  constructor(message = "موردی یافت نشد.", details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Invalid from/to transition or role for a transition. Transport: 409. */
export class WorkflowError extends DomainError {
  readonly code = "WORKFLOW" as const;
  readonly status = 409;
  constructor(message = "این تغییر وضعیت مجاز نیست.", details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Mutation attempted on a locked document. Transport: 409 → prompt to revise. */
export class LockedError extends DomainError {
  readonly code = "LOCKED" as const;
  readonly status = 409;
  constructor(
    message = "سند قفل شده است؛ برای اصلاح، نسخهٔ جدید ایجاد کنید.",
    details?: Record<string, unknown>,
  ) {
    super(message, details);
  }
}

/** Bad input. Transport: 422 → field-level messages. */
export class ValidationError extends DomainError {
  readonly code = "VALIDATION" as const;
  readonly status = 422;
  constructor(message = "ورودی نامعتبر است.", details?: Record<string, unknown>) {
    super(message, details);
  }
}

/** Type guard for any domain error. */
export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}

/**
 * Maps an unknown thrown value to a safe transport payload. Unknown errors
 * become a generic 500 with no internal detail exposed.
 */
export function toTransport(err: unknown): {
  status: number;
  body: { error: { code: DomainErrorCode | "INTERNAL"; message: string } };
} {
  if (isDomainError(err)) {
    return { status: err.status, body: { error: { code: err.code, message: err.message } } };
  }
  return {
    status: 500,
    body: { error: { code: "INTERNAL", message: "خطای داخلی سرور رخ داد." } },
  };
}
