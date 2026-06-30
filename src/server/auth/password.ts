/**
 * Secure password hashing and constant-time verification.
 *
 * Uses Node's built-in `crypto.scrypt` (a vetted, memory-hard KDF) with a
 * per-password random salt. The stored value is a self-describing string:
 *
 *   scrypt$<saltHex>$<hashHex>
 *
 * This format is intentionally compatible with `prisma/seed.ts`, so the seeded
 * SYSTEM_ADMIN can authenticate through this module without re-hashing.
 *
 * Verification recomputes the derived key and compares it with
 * `crypto.timingSafeEqual` to avoid leaking information via timing.
 *
 * Security notes:
 * - Never log the plaintext password, the salt, or the derived hash.
 * - `verifyPassword` never throws on malformed input; it returns `false`.
 *
 * Requirements: 2.4
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/** Algorithm identifier stored as the first field of the encoded hash. */
const SCHEME = "scrypt";
/** Salt length in bytes. */
const SALT_BYTES = 16;
/** Derived key length in bytes (must match the seed routine). */
const KEY_LENGTH = 64;

/**
 * Hashes a plaintext password with a fresh random salt.
 *
 * @returns an encoded, self-describing hash string `scrypt$<saltHex>$<hashHex>`.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return `${SCHEME}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/**
 * Verifies a plaintext password against a stored encoded hash using a
 * constant-time comparison. Returns `false` (never throws) for malformed or
 * unrecognized stored values.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [scheme, saltHex, hashHex] = parts;
  if (scheme !== SCHEME || !saltHex || !hashHex) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = (await scryptAsync(plain, salt, expected.length)) as Buffer;
  // Lengths are equal by construction (we derived `expected.length` bytes), but
  // guard anyway so timingSafeEqual never throws.
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

let cachedDummyHash: Promise<string> | null = null;

/**
 * Returns a stable-per-process dummy hash used to equalize work when an account
 * is not found, defeating user-enumeration via response timing. The underlying
 * value is a hash of a throwaway random string and reveals nothing.
 */
export function dummyHash(): Promise<string> {
  if (cachedDummyHash === null) {
    cachedDummyHash = hashPassword(randomBytes(24).toString("hex"));
  }
  return cachedDummyHash;
}
