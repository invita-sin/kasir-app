import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (req, _ctx, requestId) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`login:${ip}`, 5, 60000))) {
    logger.warn({ event: "auth.login.rate_limited", requestId, ip });
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
    id: result.id,
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

  return response;
}, "POST", "/api/auth/login");
