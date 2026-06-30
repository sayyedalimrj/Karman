// @vitest-environment jsdom
/**
 * Component tests for the Login form.
 *
 * Verifies the real form renders (email + password fields, a generic error
 * region), that submitting POSTs to the REAL `/api/auth` endpoint, and that a
 * failed login shows the GENERIC credential error (no field-level disclosure).
 *
 * Requirements: 2.1, 2.3
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { LoginForm } from "./LoginForm";
import { t } from "@/lib/i18n";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LoginForm", () => {
  it("renders the email and password fields and an error region", () => {
    render(<LoginForm next="/dashboard" />);
    expect(screen.getByLabelText(t.auth.email)).toBeDefined();
    expect(screen.getByLabelText(t.auth.password)).toBeDefined();
    // A stable error region exists (role=alert), empty until a failure occurs.
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByRole("button", { name: t.auth.submit })).toBeDefined();
  });

  it("posts credentials to /api/auth on submit", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    // Prevent jsdom navigation noise on the success path.
    vi.stubGlobal("location", { assign: vi.fn() });

    render(<LoginForm next="/dashboard" />);
    fireEvent.change(screen.getByLabelText(t.auth.email), {
      target: { value: "user@karman.test" },
    });
    fireEvent.change(screen.getByLabelText(t.auth.password), {
      target: { value: "correct-horse" },
    });
    fireEvent.click(screen.getByRole("button", { name: t.auth.submit }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("/api/auth");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.email).toBe("user@karman.test");
  });

  it("shows the generic credential error on a failed login", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

    render(<LoginForm next="/dashboard" />);
    fireEvent.change(screen.getByLabelText(t.auth.email), {
      target: { value: "user@karman.test" },
    });
    fireEvent.change(screen.getByLabelText(t.auth.password), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: t.auth.submit }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe(t.auth.invalidCredentials),
    );
  });
});
