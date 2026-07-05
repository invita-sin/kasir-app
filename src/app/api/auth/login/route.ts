import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { handleApiError } from "@/lib/errors";
import { config } from "@/lib/config";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";
import { checkRateLimit } from "@/lib/rate-limit";
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await checkRateLimit(`login:${ip}`, 5, 60000))) {
      logger.warn({ event: "auth.login.rate_limited", requestId, ip });
      httpRequestsTotal.inc({ method: "POST", path: "/api/auth/login", status: 429 });
      httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/login" }, (Date.now() - start) / 1000);
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Silakan coba lagi dalam 1 menit", code: "RATE_LIMITED", requestId },
        { status: 429 }
      );
    }

    const body = await parseJsonBody(req);
    const result = await AuthService.login(body);

    logger.info({ event: "auth.login.success", requestId, username: result.username, role: result.role });

    const response = NextResponse.json({
      success: true,
      username: result.username,
      name: result.name,
      role: result.role,
      cabang: result.cabang,
    });
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

    httpRequestsTotal.inc({ method: "POST", path: "/api/auth/login", status: 200 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/login" }, (Date.now() - start) / 1000);

    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "POST", path: "/api/auth/login", status: 500 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/auth/login" }, duration);
    return handleApiError(error, requestId);
  }
}
