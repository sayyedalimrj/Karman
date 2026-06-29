/**
 * Unit tests for password hashing and constant-time verification.
 *
 * Requirements: 2.4
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("never stores the plaintext password", async () => {
    const plain = "correct horse battery staple";
    const stored = await hashPassword(plain);
    expect(stored).not.toContain(plain);
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored.split("$")).toHaveLength(3);
  });

  it("verifies the correct password", async () => {
    const stored = await hashPassword("s3cret-pass");
    await expect(verifyPassword("s3cret-pass", stored)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("s3cret-pass");
    await expect(verifyPassword("wrong-pass", stored)).resolves.toBe(false);
  });

  it("uses a different salt (and hash) for each call on the same password", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    const saltA = a.split("$")[1];
    const saltB = b.split("$")[1];
    expect(saltA).not.toBe(saltB);
    // Both must still verify.
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("returns false for malformed stored values without throwing", async () => {
    await expect(verifyPassword("x", "")).resolves.toBe(false);
    await expect(verifyPassword("x", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("x", "scrypt$only-salt")).resolves.toBe(false);
    await expect(verifyPassword("x", "bcrypt$aa$bb")).resolves.toBe(false);
  });

  it("round-trips arbitrary passwords (property)", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        async (pwd, other) => {
          const stored = await hashPassword(pwd);
          expect(await verifyPassword(pwd, stored)).toBe(true);
          if (other !== pwd) {
            expect(await verifyPassword(other, stored)).toBe(false);
          }
        },
      ),
      { numRuns: 25 },
    );
  });
});
