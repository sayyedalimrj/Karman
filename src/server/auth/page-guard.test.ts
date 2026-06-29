/**
 * Unit tests for the page guards. These verify the GUARD LOGIC (redirect when
 * there is no session; return the user otherwise) by mocking the session
 * resolver and Next's `redirect`.
 *
 * Requirements: 2.5, 4.5
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const getCurrentUser = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getCurrentUser: () => getCurrentUser(),
}));

// Mimic Next's `redirect`, which throws a special control-flow error.
class RedirectError extends Error {
  constructor(public readonly to: string) {
    super(`REDIRECT:${to}`);
  }
}
const redirect = vi.fn((to: string) => {
  throw new RedirectError(to);
});
vi.mock("next/navigation", () => ({
  redirect: (to: string) => redirect(to),
}));

import { requirePageUser, redirectIfAuthenticated } from "./page-guard";

beforeEach(() => {
  getCurrentUser.mockReset();
  redirect.mockClear();
});

describe("requirePageUser", () => {
  it("redirects to /login with a sanitized next when unauthenticated", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    await expect(requirePageUser("/inbox")).rejects.toBeInstanceOf(RedirectError);
    expect(redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/inbox")}`);
  });

  it("sanitizes an unsafe next before redirecting", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    await expect(requirePageUser("//evil.example")).rejects.toBeInstanceOf(RedirectError);
    expect(redirect).toHaveBeenCalledWith(`/login?next=${encodeURIComponent("/dashboard")}`);
  });

  it("returns the user when authenticated (no redirect)", async () => {
    const user = { id: "u1", email: "a@b.c", fullName: "A", systemRole: "VIEWER" };
    getCurrentUser.mockResolvedValueOnce(user);
    await expect(requirePageUser("/dashboard")).resolves.toEqual(user);
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("redirectIfAuthenticated", () => {
  it("redirects an already-authenticated user to the next target", async () => {
    getCurrentUser.mockResolvedValueOnce({ id: "u1" });
    await expect(redirectIfAuthenticated("/inbox")).rejects.toBeInstanceOf(RedirectError);
    expect(redirect).toHaveBeenCalledWith("/inbox");
  });

  it("does nothing for an unauthenticated visitor", async () => {
    getCurrentUser.mockResolvedValueOnce(null);
    await expect(redirectIfAuthenticated("/inbox")).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});
