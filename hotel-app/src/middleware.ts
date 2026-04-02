import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/middleware";

const PUBLIC_PATHS = ["/login", "/register", "/_next/", "/favicon", "/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const supabaseResponse = await updateSession(request);

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return supabaseResponse;
  }

  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$/.test(pathname)) {
    return supabaseResponse;
  }

  const token = request.cookies.get("cravecart_hotel_token")?.value;

  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("redirect", pathname);
    }
    const response = NextResponse.redirect(url);
    response.cookies.delete("cravecart_hotel_token");
    return response;
  }

  const response = supabaseResponse;
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
