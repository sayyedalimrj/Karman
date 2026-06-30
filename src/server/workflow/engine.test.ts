/**
 * Unit + property tests for the workflow engine guards (DB-free).
 *
 * Property CP3: Only valid transitions are accepted.
 * **Validates: Requirements 5.2, 5.3, 5.4**
 *
 * The transition guard `assertCanTransition` is pure (no I/O), so these tests
 * exercise the full transition table without a database.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { AuditAction, Role, WorkflowState } from "@prisma/client";
import { allowedTransitions, assertCanTransition, lookupRule } from "./engine";
import { TRANSITIONS, isLockedState } from "./transitions";
import { WorkflowError } from "@/lib/errors";

const ALL_STATES = Object.values(WorkflowState);
const ALL_ROLES = Object.values(Role);

/** Reference oracle: does an accepted transition exist for (from,to,role)? */
function shouldSucceed(from: WorkflowState, to: WorkflowState, role: Role): boolean {
  const rule = TRANSITIONS.find((r) => r.from === from && r.to === to);
  if (!rule) return false;
  return role === Role.SYSTEM_ADMIN || rule.allowedRoles.includes(role);
}

describe("transition table integrity", () => {
  it("contains exactly the 17 approved rows", () => {
    expect(TRANSITIONS).toHaveLength(17);
  });

  it("every row records a WORKFLOW_TRANSITION audit action", () => {
    for (const rule of TRANSITIONS) {
      expect(rule.auditActions).toContain(AuditAction.WORKFLOW_TRANSITION);
    }
  });

  it("only the EMPLOYER_APPROVED → DOCUMENT_LOCKED row sets locks=true", () => {
    const locking = TRANSITIONS.filter((r) => r.locks === true);
    expect(locking).toHaveLength(1);
    expect(locking[0]).toMatchObject({
      from: WorkflowState.EMPLOYER_APPROVED,
      to: WorkflowState.DOCUMENT_LOCKED,
    });
  });

  it("the lock row also emits a LOCK audit action and export row emits EXPORT", () => {
    expect(lookupRule(WorkflowState.EMPLOYER_APPROVED, WorkflowState.DOCUMENT_LOCKED)?.auditActions)
      .toContain(AuditAction.LOCK);
    expect(lookupRule(WorkflowState.EXPORT_READY, WorkflowState.EXPORTED_TO_TAKSA)?.auditActions)
      .toContain(AuditAction.EXPORT);
  });
});

describe("allowedTransitions", () => {
  it("returns only rules whose from matches", () => {
    for (const state of ALL_STATES) {
      const rules = allowedTransitions(state);
      for (const r of rules) expect(r.from).toBe(state);
      expect(rules.length).toBe(TRANSITIONS.filter((t) => t.from === state).length);
    }
  });
});

describe("assertCanTransition — explicit allowed rows", () => {
  it("accepts each approved row for one of its allowed roles", () => {
    for (const rule of TRANSITIONS) {
      const role = rule.allowedRoles[0];
      expect(role).toBeDefined();
      if (!role) continue;
      expect(() => assertCanTransition({ state: rule.from }, rule.to, role)).not.toThrow();
    }
  });

  it("accepts every approved edge for SYSTEM_ADMIN (recovery override)", () => {
    for (const rule of TRANSITIONS) {
      expect(() =>
        assertCanTransition({ state: rule.from }, rule.to, Role.SYSTEM_ADMIN),
      ).not.toThrow();
    }
  });
});

describe("assertCanTransition — rejections", () => {
  it("rejects a non-existent edge even for SYSTEM_ADMIN", () => {
    // PROJECT_DRAFT → DOCUMENT_LOCKED is not a real edge.
    expect(() =>
      assertCanTransition(
        { state: WorkflowState.PROJECT_DRAFT },
        WorkflowState.DOCUMENT_LOCKED,
        Role.SYSTEM_ADMIN,
      ),
    ).toThrow(WorkflowError);
  });

  it("rejects a real edge for a disallowed role", () => {
    // Row 1 allows only PROJECT_ADMIN.
    expect(() =>
      assertCanTransition(
        { state: WorkflowState.PROJECT_DRAFT },
        WorkflowState.PROJECT_ACTIVE,
        Role.VIEWER,
      ),
    ).toThrow(WorkflowError);
  });
});

describe("CP3 — only valid transitions are accepted (property)", () => {
  it("succeeds iff a matching rule exists (role allowed or SYSTEM_ADMIN)", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_STATES),
        fc.constantFrom(...ALL_STATES),
        fc.constantFrom(...ALL_ROLES),
        (from, to, role) => {
          const expected = shouldSucceed(from, to, role);
          if (expected) {
            expect(() => assertCanTransition({ state: from }, to, role)).not.toThrow();
          } else {
            expect(() => assertCanTransition({ state: from }, to, role)).toThrow(WorkflowError);
          }
        },
      ),
      { numRuns: 2000 },
    );
  });
});

describe("locked-state classification", () => {
  it("classifies the three terminal/locked states", () => {
    expect(isLockedState(WorkflowState.DOCUMENT_LOCKED)).toBe(true);
    expect(isLockedState(WorkflowState.EXPORT_READY)).toBe(true);
    expect(isLockedState(WorkflowState.EXPORTED_TO_TAKSA)).toBe(true);
    expect(isLockedState(WorkflowState.DOCUMENT_DRAFT)).toBe(false);
  });
});
