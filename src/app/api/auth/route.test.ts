/**
 * Unit tests for the auth route handler: invalid-credential rejection must not
 * disclose which field was wrong, and must not establish a session.
 *
 * Requirements: 2.2, 2.3
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const findUnique = vi.fn();
vi.mock("@/server/db", () => ({
  prisma: { user: { findUnique: (args: unknown) => findUnique(args) } },
}));

const verifyPassword = vi.fn();
const dummyHash = vi.fn(async () => "scrypt$aa$bb");
vi.mock("@/server/auth/password", () => ({
  verifyPassword: (a: string, b: string) => verifyPassword(a, b),
  dummyHash: () => dummyHash(),
}));

const createSession = vi.fn(async (_u: unknown) => {});
const destroySession = vi.fn(async () => {});
vi.mock("@/server/auth/session", () => ({
  createSession: (u: unknown) => createSession(u),
  destroySession: () => destroySession(),
}));

import { POST, DELETE } from "./route";

function loginRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  process.env.SESSION_SECRET = "test-secret";
  findUnique.mockReset();
  verifyPassword.mockReset();
  createSession.mockClear();
  destroySession.mockClear();
});

describe("POST /api/auth (login)", () => {
  it("returns the same generic 401 for unknown email and for wrong password", async () => {
    // Unknown email
    findUnique.mockResolvedValueOnce(null);
    verifyPassword.mockResolvedValueOnce(false);
    const res1 = await POST(loginRequest({ email: "nobody@x.test", password: "whatever" }));
    const body1 = await res1.json();

    // Known email, wrong password
    findUnique.mockResolvedValueOnce({ id: "u1", passwordHash: "scrypt$aa$bb", isActive: true });
    verifyPassword.mockResolvedValueOnce(false);
    const res2 = await POST(loginRequest({ email: "real@x.test", password: "wrong" }));
    const body2 = await res2.json();

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(body1).toEqual(body2);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("always runs a verification even when the account is absent", async () => {
    findUnique.mockResolvedValueOnce(null);
    verifyPassword.mockResolvedValueOnce(false);
    await POST(loginRequest({ email: "ghost@x.test", password: "p" }));
    expect(dummyHash).toHaveBeenCalled();
    expect(verifyPassword).toHaveBeenCalled();
  });

  it("does not establish a session for an inactive user", async () => {
    findUnique.mockResolvedValueOnce({ id: "u1", passwordHash: "scrypt$aa$bb", isActive: false });
    verifyPassword.mockResolvedValueOnce(true);
    const res = await POST(loginRequest({ email: "real@x.test", password: "right" }));
    expect(res.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("establishes a session on valid credentials", async () => {
    findUnique.mockResolvedValueOnce({ id: "u1", passwordHash: "scrypt$aa$bb", isActive: true });
    verifyPassword.mockResolvedValueOnce(true);
    const res = await POST(loginRequest({ email: "real@x.test", password: "right" }));
    expect(res.status).toBe(200);
    expect(createSession).toHaveBeenCalledWith({ id: "u1" });
  });

  it("rejects malformed input generically without disclosure", async () => {
    const res = await POST(loginRequest({ email: "not-an-email" }));
    expect(res.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/auth (logout)", () => {
  it("clears the session", async () => {
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(destroySession).toHaveBeenCalled();
  });
});
