/**
 * Route-protection middleware (presentation/redirect only).
 *
 * This middleware redirects UNAUTHENTICATED requests for protected `(app)`
 * routes to the login page. It is intentionally edge-safe: it only inspects the
 * presence and structural shape of the session cookie and imports no Prisma or
 * Node-only modules.
 *
 * IMPORTANT: This is NOT the authorization boundary. The real boundary is the
 * server-side permission service (`src/server/permissions`), which every
 * sensitive read and mutation must pass through. A structurally-present cookie
 * here only avoids rendering protected shells for clearly-unauthenticated
 * users; it does not grant any access.
 *
 * Requirements: 2.5, 4.5
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Kept in sync with `SESSION_COOKIE_NAME` in `src/server/auth/session.ts`.
// Inlined here so the edge bundle does not import the Node-only session module.
const SESSION_COOKIE_NAME = "karman_session";

const LOGIN_PATH = "/login";

/** Returns true when the cookie value has the expected `<body>.<sig>` shape. */
function looksLikeSession(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  return dot > 0 && dot < token.length - 1;
}

/** Header used to forward the current pathname to server components. */
const PATHNAME_HEADER = "x-karman-pathname";

export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (looksLikeSession(token)) {
    // Forward the pathname so server layouts/pages can derive the active nav
    // item, section title, and a safe `next` target without re-parsing the URL.
    // This is presentation metadata only — NOT an authorization signal.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

/**
 * Protect the authenticated `(app)` routes. The matcher excludes `/login`,
 * `/api/*` (including `/api/health`), Next internals (`_next`), and static
 * assets by only listing the protected route prefixes.
 */
export const config = {
  matcher: ["/dashboard/:path*", "/inbox/:path*", "/projects/:path*"],
};
