/**
 * Unit tests for `sanitizeNextPath` — prevents open-redirect via the login
 * `?next=` parameter by accepting only same-origin relative paths.
 */
import { describe, it, expect } from "vitest";
import { sanitizeNextPath, DEFAULT_NEXT_PATH } from "./next-path";

describe("sanitizeNextPath", () => {
  it("accepts a simple root-relative path", () => {
    expect(sanitizeNextPath("/inbox")).toBe("/inbox");
    expect(sanitizeNextPath("/projects/setup")).toBe("/projects/setup");
  });

  it("falls back for absolute URLs and protocol-relative URLs", () => {
    expect(sanitizeNextPath("https://evil.example/x")).toBe(DEFAULT_NEXT_PATH);
    expect(sanitizeNextPath("//evil.example")).toBe(DEFAULT_NEXT_PATH);
    expect(sanitizeNextPath("/\\evil.example")).toBe(DEFAULT_NEXT_PATH);
  });

  it("falls back for non-relative or empty values", () => {
    expect(sanitizeNextPath("dashboard")).toBe(DEFAULT_NEXT_PATH);
    expect(sanitizeNextPath("")).toBe(DEFAULT_NEXT_PATH);
    expect(sanitizeNextPath(null)).toBe(DEFAULT_NEXT_PATH);
    expect(sanitizeNextPath(undefined)).toBe(DEFAULT_NEXT_PATH);
  });

  it("rejects values containing control characters or whitespace", () => {
    expect(sanitizeNextPath("/foo\nbar")).toBe(DEFAULT_NEXT_PATH);
    expect(sanitizeNextPath("/foo bar")).toBe(DEFAULT_NEXT_PATH);
  });

  it("honors a custom fallback", () => {
    expect(sanitizeNextPath(null, "/inbox")).toBe("/inbox");
  });
});
