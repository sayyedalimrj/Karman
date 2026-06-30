/**
 * Unit tests for the audit service's metadata redaction policy (DB-free).
 *
 * The append-only audit trail must never store secrets. These tests confirm
 * sensitive keys are redacted (recursively) while benign data is preserved.
 *
 * Requirements: 7.3 (no secrets in audit metadata)
 */
import { describe, it, expect } from "vitest";
import { redactSensitiveMetadata } from "./index";

describe("redactSensitiveMetadata", () => {
  it("redacts top-level sensitive keys", () => {
    const out = redactSensitiveMetadata({
      password: "hunter2",
      passwordHash: "scrypt$...",
      token: "abc.def",
      sessionSecret: "s3cr3t",
      cookie: "karman_session=...",
      DATABASE_URL: "postgresql://u:p@h/db",
      note: "fine",
    });
    expect(out.password).toBe("[REDACTED]");
    expect(out.passwordHash).toBe("[REDACTED]");
    expect(out.token).toBe("[REDACTED]");
    expect(out.sessionSecret).toBe("[REDACTED]");
    expect(out.cookie).toBe("[REDACTED]");
    expect(out.DATABASE_URL).toBe("[REDACTED]");
    expect(out.note).toBe("fine");
  });

  it("redacts nested sensitive keys inside objects and arrays", () => {
    const out = redactSensitiveMetadata({
      user: { id: "u1", apiKey: "k-123" },
      events: [{ authorization: "Bearer x" }, { ok: true }],
    });
    expect((out.user as Record<string, unknown>).id).toBe("u1");
    expect((out.user as Record<string, unknown>).apiKey).toBe("[REDACTED]");
    const events = out.events as Array<Record<string, unknown>>;
    expect(events[0]?.authorization).toBe("[REDACTED]");
    expect(events[1]?.ok).toBe(true);
  });

  it("preserves non-sensitive structured data", () => {
    const input = { fromState: "DOCUMENT_DRAFT", toState: "MEASUREMENT_IN_PROGRESS", count: 3 };
    expect(redactSensitiveMetadata(input)).toEqual(input);
  });
});
