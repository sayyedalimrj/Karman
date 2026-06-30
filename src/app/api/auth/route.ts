/**
 * Authentication route handlers.
 *
 *   POST   /api/auth   → login
 *   DELETE /api/auth   → logout
 *
 * Login verifies credentials with a constant-time password check and, on
 * success, establishes an httpOnly session cookie. Failures return a generic
 * 401 that does NOT reveal whether the email or the password was wrong. A hash
 * verification always runs — even when the account does not exist — so response
 * timing cannot be used to enumerate accounts.
 *
 * Domain errors are mapped through the central transport helper; stack traces
 * and secrets are never returned to the client.
 *
 * Requirements: 2.1, 2.2, 2.3
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db";
import { dummyHash, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession } from "@/server/auth/session";
import { toTransport } from "@/lib/errors";
import { t } from "@/lib/i18n";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Generic credential-rejection response (no field disclosure). */
function invalidCredentials(): NextResponse {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: t.auth.invalidCredentials } },
    { status: 401 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Malformed body is treated as invalid credentials (no detail leaked).
    return invalidCredentials();
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    // Do not disclose which field failed validation — same generic rejection.
    return invalidCredentials();
  }

  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, isActive: true },
    });

    // Always run a verification to keep timing uniform whether or not the user
    // exists; use a dummy hash when the account is absent.
    const storedHash = user?.passwordHash ?? (await dummyHash());
    const passwordOk = await verifyPassword(password, storedHash);

    if (!user || !user.isActive || !passwordOk) {
      return invalidCredentials();
    }

    await createSession({ id: user.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const { status, body: payload } = toTransport(err);
    return NextResponse.json(payload, { status });
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    await destroySession();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    const { status, body: payload } = toTransport(err);
    return NextResponse.json(payload, { status });
  }
}
