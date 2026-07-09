import { NextRequest, NextResponse } from "next/server";
import { verifyTokenEdge } from "@/lib/auth-edge";
import { config as appConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/refresh", "/api/health", "/api/ready"];

const kasirAllowedPagePaths = ["/transactions"];

function isKasirAllowedPage(pathname: string): boolean {
  return kasirAllowedPagePaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function addSecurityHeaders(response: NextResponse) {
  const headers = response.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  const scriptSrc = appConfig.NODE_ENV === "production"
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";
  headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:`
  );
  if (appConfig.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Access-Control-Allow-Origin", appConfig.CORS_ORIGIN);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export async function proxy(req: NextRequest) {
  const { pathname } = new URL(req.url);

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/_next")) {
    return addSecurityHeaders(NextResponse.next());
  }

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  const token = req.cookies.get("token")?.value;

  if (!token) {
    logger.warn({ event: "proxy.auth.missing_token", path: pathname });
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
      );
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)));
  }

  const payload = await verifyTokenEdge(token);
  if (!payload) {
    logger.warn({ event: "proxy.auth.invalid_token", path: pathname });
    if (pathname.startsWith("/api/")) {
      return addSecurityHeaders(
        NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 })
      );
    }
    return addSecurityHeaders(NextResponse.redirect(new URL("/login", req.url)));
  }

  if (payload.role !== "SUPER_ADMIN" && payload.role !== "ADMIN" && !pathname.startsWith("/api/") && !isKasirAllowedPage(pathname)) {
    return addSecurityHeaders(NextResponse.redirect(new URL("/transactions", req.url)));
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
