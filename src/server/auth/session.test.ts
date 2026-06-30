/**
 * Unit tests for session token signing/verification, cookie attributes, and
 * current-user resolution.
 *
 * Requirements: 2.2, 2.5
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// A controllable in-memory cookie store standing in for Next's request cookies.
interface SetCall {
  name: string;
  value: string;
  options: Record<string, unknown>;
}
const store = {
  jar: new Map<string, string>(),
  setCalls: [] as SetCall[],
  get(name: string): { value: string } | undefined {
    const value = this.jar.get(name);
    return value === undefined ? undefined : { value };
  },
  set(name: string, value: string, options: Record<string, unknown>): void {
    this.setCalls.push({ name, value, options });
    this.jar.set(name, value);
  },
};

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(store),
}));

const findUnique = vi.fn();
vi.mock("@/server/db", () => ({
  prisma: { user: { findUnique: (args: unknown) => findUnique(args) } },
}));

import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  createSession,
  destroySession,
  getCurrentUser,
  requireUser,
} from "./session";
import { UnauthorizedError } from "@/lib/errors";

/** NODE_ENV is typed read-only; assign via a cast helper for tests. */
function setNodeEnv(value: string): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-session-secret-value";
  setNodeEnv("test");
  store.jar.clear();
  store.setCalls = [];
  findUnique.mockReset();
});

describe("session token", () => {
  it("signs and verifies a token round-trip", () => {
    const token = createSessionToken("user-123");
    const payload = verifySessionToken(token);
    expect(payload?.uid).toBe("user-123");
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken("user-123");
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken("user-123");
    process.env.SESSION_SECRET = "a-completely-different-secret";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("no-dot")).toBeNull();
    expect(verifySessionToken(".sig")).toBeNull();
    expect(verifySessionToken("body.")).toBeNull();
  });
});

describe("getSessionSecret (fail fast)", () => {
  it("throws a clear, non-secret error when SESSION_SECRET is missing", () => {
    delete process.env.SESSION_SECRET;
    expect(() => createSessionToken("u")).toThrow(/SESSION_SECRET/);
  });
});

describe("sessionCookieOptions", () => {
  it("sets httpOnly, sameSite=lax, path=/ and secure outside development", () => {
    setNodeEnv("production");
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe("lax");
    expect(opts.path).toBe("/");
    expect(opts.secure).toBe(true);
  });

  it("does not require secure in development", () => {
    setNodeEnv("development");
    expect(sessionCookieOptions().secure).toBe(false);
  });
});

describe("createSession / destroySession", () => {
  it("sets a signed session cookie with secure attributes", async () => {
    setNodeEnv("production");
    await createSession({ id: "user-abc" });
    const call = store.setCalls.at(-1);
    expect(call?.name).toBe(SESSION_COOKIE_NAME);
    expect(verifySessionToken(call?.value ?? "")?.uid).toBe("user-abc");
    expect(call?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax" });
  });

  it("clears the cookie on logout (maxAge 0)", async () => {
    await destroySession();
    const call = store.setCalls.at(-1);
    expect(call?.name).toBe(SESSION_COOKIE_NAME);
    expect(call?.value).toBe("");
    expect(call?.options).toMatchObject({ maxAge: 0, httpOnly: true });
  });
});

describe("getCurrentUser / requireUser", () => {
  it("returns null when no cookie is present", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null for an invalid cookie token", async () => {
    store.jar.set(SESSION_COOKIE_NAME, "garbage.token");
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("resolves the user for a valid session", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.test",
      fullName: "Test User",
      systemRole: "VIEWER",
      isActive: true,
    });
    store.jar.set(SESSION_COOKIE_NAME, createSessionToken("user-1"));
    await expect(getCurrentUser()).resolves.toEqual({
      id: "user-1",
      email: "a@b.test",
      fullName: "Test User",
      systemRole: "VIEWER",
    });
  });

  it("returns null when the user is inactive", async () => {
    findUnique.mockResolvedValue({
      id: "user-1",
      email: "a@b.test",
      fullName: "Test User",
      systemRole: "VIEWER",
      isActive: false,
    });
    store.jar.set(SESSION_COOKIE_NAME, createSessionToken("user-1"));
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("requireUser throws UnauthorizedError without a session", async () => {
    await expect(requireUser()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
