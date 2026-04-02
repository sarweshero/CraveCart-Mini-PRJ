import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — route protection.
 *
 * Public paths: accessible without auth.
 * Protected paths: require token cookie.
 * Profile-incomplete paths: require profile completion.
 *
 * SECURITY: Token validation (expiry/revocation) is enforced by the backend.
 * This middleware only checks cookie presence for quick redirects.
 */

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/auth/callback",
  "/complete-profile",
  "/_next/",
  "/favicon",
  "/health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals and public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip middleware for static assets
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/.test(pathname)) {
    return NextResponse.next();
  }

  const token           = request.cookies.get("cravecart_token")?.value;
  const profileComplete = request.cookies.get("cravecart_profile_complete")?.value;

  // No token → redirect to login with return URL
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Only set redirect param for non-root paths to keep URLs clean
    if (pathname !== "/") {
      url.searchParams.set("redirect", pathname);
    }
    const response = NextResponse.redirect(url);
    // Clear any stale cookies on redirect
    response.cookies.delete("cravecart_token");
    response.cookies.delete("cravecart_profile_complete");
    return response;
  }

  // Token present but profile incomplete → redirect to complete-profile
  if (profileComplete === "false" && !pathname.startsWith("/complete-profile")) {
    const url = request.nextUrl.clone();
    url.pathname = "/complete-profile";
    return NextResponse.redirect(url);
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
