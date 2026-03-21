import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — runs before every request.
 *
 * Rules:
 * 1. Unauthenticated users hitting protected routes → redirect to /login
 * 2. Authenticated users with incomplete profiles → redirect to /complete-profile
 *    (except on the /complete-profile page itself and /api/* routes)
 *
 * We read the token from localStorage only on the client, so here we check
 * for the existence of the token cookie that the login page can optionally
 * set, OR we rely on client-side guards for the full auth flow.
 * This middleware primarily guards against direct URL access.
 */

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/complete-profile",
  "/api/",
  "/_next/",
  "/favicon",
  "/health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all public paths through
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Read auth token from cookie (set by login page for SSR-compatible auth check)
  const token           = request.cookies.get("cravecart_token")?.value;
  const profileComplete = request.cookies.get("cravecart_profile_complete")?.value;

  // No token → redirect to login
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Token present but profile not complete → redirect to complete-profile
  if (profileComplete === "false" && pathname !== "/complete-profile") {
    const url = request.nextUrl.clone();
    url.pathname = "/complete-profile";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static assets and API routes
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
