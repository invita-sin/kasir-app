import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (req, _ctx, requestId) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`refresh:${ip}`, 10, 60000))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan", code: "RATE_LIMITED" }, { status: 429 });
  }

  const refreshToken = req.cookies.get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const result = await AuthService.refreshToken(refreshToken);
  if (!result) {
    logger.warn({ event: "auth.refresh.invalid", requestId });

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

  return response;
}, "POST", "/api/auth/refresh");
