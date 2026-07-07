import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (_req, _ctx, requestId) => {
  logger.info({ event: "auth.logout", requestId });

  const clearCookie = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0,
  };

  const response = NextResponse.json({ success: true });
  response.cookies.set("token", "", clearCookie);
  response.cookies.set("refreshToken", "", clearCookie);

  return response;
}, "POST", "/api/auth/logout");
