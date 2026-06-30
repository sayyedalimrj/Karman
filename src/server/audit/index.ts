/**
 * Append-only audit service.
 *
 * Writes immutable `AuditLog` rows. The service ONLY ever inserts — it never
 * updates or deletes existing audit rows. Callers pass their own Prisma
 * transaction client (`tx`) so the audit insert shares the caller's
 * transaction; this is what makes a workflow transition and its audit record
 * atomic (CP5): if either fails, both roll back.
 *
 * Security: audit `metadata` must never contain secrets. Sensitive fields
 * (password hashes, tokens, cookies, session/DB secrets) are redacted before
 * persistence so they can never leak into the audit trail.
 *
 * Requirements: 7.1, 7.3 (append-only; same-transaction write)
 */
import { Prisma, type AuditAction, type WorkflowState } from "@prisma/client";

/**
 * Prisma transaction client. This is the interactive-transaction client passed
 * to the callback of `prisma.$transaction(async (tx) => { ... })`.
 */
export type AuditTx = Prisma.TransactionClient;

/** Input describing a single audit event. */
export interface AuditEntryInput {
  /** Authenticated actor performing the action. */
  actorUserId: string;
  /** Action recorded (e.g. WORKFLOW_TRANSITION, LOCK, EXPORT, CREATE). */
  action: AuditAction;
  /** Entity kind, e.g. "WorkflowCase", "Contract". */
  entityType: string;
  /** Affected entity id. */
  entityId: string;
  /** Optional owning project. */
  projectId?: string | null;
  /** Optional related workflow case. */
  workflowCaseId?: string | null;
  /** Optional workflow from-state (for transitions). */
  fromState?: WorkflowState | null;
  /** Optional workflow to-state (for transitions). */
  toState?: WorkflowState | null;
  /** Optional NON-SENSITIVE context. Sensitive keys are redacted on write. */
  metadata?: Record<string, unknown> | null;
}

/** Sentinel stored in place of any sensitive value. */
const REDACTED = "[REDACTED]" as const;

/**
 * Substrings (matched case-insensitively against object keys) that mark a value
 * as sensitive. Anything matching is redacted before the row is persisted, so
 * secrets can never enter the append-only audit trail.
 */
const SENSITIVE_KEY_PATTERNS: readonly string[] = [
  "password",
  "passwordhash",
  "secret",
  "session_secret",
  "sessionsecret",
  "token",
  "cookie",
  "authorization",
  "database_url",
  "databaseurl",
  "apikey",
  "api_key",
  "privatekey",
  "private_key",
];

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => k.includes(pattern));
}

/**
 * Recursively redacts sensitive entries from arbitrary metadata. Objects and
 * arrays are walked; any object key flagged sensitive has its value replaced
 * with the redaction sentinel. Non-plain values are returned as-is.
 */
function sanitizeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeMetadata(item));
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? REDACTED : sanitizeMetadata(val);
    }
    return out;
  }
  return value;
}

/** Exposed for unit testing of the redaction policy. */
export function redactSensitiveMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return sanitizeMetadata(metadata) as Record<string, unknown>;
}

/**
 * Records an immutable audit entry inside the caller's transaction.
 *
 * The `tx` client MUST be the caller's active transaction client so the audit
 * insert is atomic with the mutation it describes. This function only inserts;
 * it never updates or deletes.
 */
export async function record(entry: AuditEntryInput, tx: AuditTx): Promise<void> {
  const metadata =
    entry.metadata == null
      ? Prisma.JsonNull
      : (sanitizeMetadata(entry.metadata) as Prisma.InputJsonValue);

  await tx.auditLog.create({
    data: {
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      projectId: entry.projectId ?? null,
      workflowCaseId: entry.workflowCaseId ?? null,
      fromState: entry.fromState ?? null,
      toState: entry.toState ?? null,
      metadata,
    },
  });
}
