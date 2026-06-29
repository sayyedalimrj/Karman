/**
 * Database seed: creates exactly ONE initial SYSTEM_ADMIN user.
 *
 * Roles are a Prisma enum (not seeded rows), so only the bootstrap admin user
 * is created here. The admin password is read from `SEED_ADMIN_PASSWORD` (or a
 * generated value is printed once for local development) and stored ONLY as a
 * salted hash.
 *
 * NOTE: This seed uses a self-contained salted hash (Node `crypto.scrypt`) so
 * it does not depend on the authentication module (implemented in a later
 * task). When the official password helper lands, swap `hashPassword` below to
 * import from `@/server/auth/password` — the on-disk format is compatible
 * (`scrypt$<salt>$<hash>` / argon2 style prefixed strings).
 *
 * Requirements: 3.6
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

/** Salted scrypt hash, encoded as `scrypt$<saltHex>$<hashHex>`. */
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Constant-time verification (used by tests / future auth integration). */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const derived = scryptSync(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(hashHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@karman.local";
  const fullName = process.env.SEED_ADMIN_NAME ?? "مدیر سامانه";

  let password = process.env.SEED_ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = randomBytes(12).toString("base64url");
    generated = true;
  }

  const admin = await prisma.user.upsert({
    where: { email },
    update: { systemRole: Role.SYSTEM_ADMIN, isActive: true },
    create: {
      email,
      fullName,
      passwordHash: hashPassword(password),
      systemRole: Role.SYSTEM_ADMIN,
      isActive: true,
    },
  });

  console.log(`[seed] SYSTEM_ADMIN ready: ${admin.email} (id=${admin.id})`);
  if (generated) {
    console.log(
      `[seed] generated initial admin password (store securely, shown once): ${password}`,
    );
  }
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
