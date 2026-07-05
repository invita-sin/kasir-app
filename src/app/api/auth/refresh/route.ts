import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { config } from "@/lib/config";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`refresh:${ip}`, 10, 60000))) {
    httpRequestsTotal.inc({ method: "POST", path: "/api/auth/refresh", status: 429 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/refresh" }, (Date.now() - start) / 1000);
    return NextResponse.json({ error: "Terlalu banyak permintaan", code: "RATE_LIMITED" }, { status: 429 });
  }

  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    httpRequestsTotal.inc({ method: "POST", path: "/api/auth/refresh", status: 401 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/refresh" }, (Date.now() - start) / 1000);
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await AuthService.refreshToken(refreshToken);
  if (!result) {
    logger.warn({ event: "auth.refresh.invalid", requestId });
    httpRequestsTotal.inc({ method: "POST", path: "/api/auth/refresh", status: 401 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/refresh" }, (Date.now() - start) / 1000);

    const clearCookie = { httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: 0 };
    const response = NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    response.cookies.set("token", "", clearCookie);
    response.cookies.set("refreshToken", "", clearCookie);
    return response;
  }

  logger.info({ event: "auth.refresh.success", requestId });

  const response = NextResponse.json({ success: true });
  const cookieOpts = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: config.JWT_EXPIRY_HOURS * 60 * 60,
  };
  const refreshCookieOpts = { ...cookieOpts, maxAge: config.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 };
  response.cookies.set("token", result.token, cookieOpts);
  response.cookies.set("refreshToken", result.refreshToken, refreshCookieOpts);

  httpRequestsTotal.inc({ method: "POST", path: "/api/auth/refresh", status: 200 });
  httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/refresh" }, (Date.now() - start) / 1000);
  return response;
}
