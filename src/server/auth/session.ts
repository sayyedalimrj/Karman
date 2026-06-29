/**
 * Session management for the App Router.
 *
 * A session is a signed, stateless token stored in an httpOnly cookie:
 *
 *   <base64url(payload)>.<base64url(HMAC-SHA256(payload, SESSION_SECRET))>
 *
 * The payload carries only the user id and an issued-at timestamp — never the
 * password hash or any secret. The current user is always resolved fresh from
 * the database so deactivated/removed users lose access immediately.
 *
 * Cookie attributes: httpOnly, sameSite=lax, path=/, and `secure` in every
 * non-development environment.
 *
 * Security notes:
 * - `SESSION_SECRET` is read from the environment and never hard-coded. A clear,
 *   non-secret error is thrown if it is missing.
 * - Never log the cookie value, the token, or the session secret.
 *
 * Requirements: 2.2, 2.5
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { prisma } from "@/server/db";
import { UnauthorizedError } from "@/lib/errors";

/** Name of the session cookie. Kept in sync with `middleware.ts` (inlined there). */
export const SESSION_COOKIE_NAME = "karman_session";

/** Session lifetime in seconds (8 hours). */
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

/** Serializable view of the authenticated user. NEVER includes `passwordHash`. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  systemRole: Role;
}

interface SessionPayload {
  /** User id. */
  uid: string;
  /** Issued-at (epoch ms). */
  iat: number;
}

/** Reads the session secret from the environment; fails fast (no secret leaked). */
function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length === 0) {
    throw new Error(
      "SESSION_SECRET is not configured. Set the SESSION_SECRET environment variable.",
    );
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
}

/** Builds a signed session token for the given user id. */
export function createSessionToken(userId: string): string {
  const payload: SessionPayload = { uid: userId, iat: Date.now() };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a session token's signature (constant-time) and parses its payload.
 * Returns `null` for any malformed or tampered token.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as SessionPayload).uid === "string" &&
      (parsed as SessionPayload).uid.length > 0
    ) {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/** Cookie attributes for the session cookie. `secure` outside development. */
export function sessionCookieOptions(maxAge: number = SESSION_MAX_AGE_SECONDS): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

/** Creates and sets the session cookie for the given user (call on login). */
export async function createSession(user: { id: string }): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(user.id), sessionCookieOptions());
}

/** Clears the session cookie (call on logout). */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
}

/**
 * Resolves the current user from the session cookie, or `null` when there is no
 * valid session (missing/invalid token, or user missing/inactive).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = verifySessionToken(raw);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.uid },
    select: { id: true, email: true, fullName: true, systemRole: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    systemRole: user.systemRole,
  };
}

/** Like {@link getCurrentUser} but throws {@link UnauthorizedError} when absent. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
