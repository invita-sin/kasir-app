import { NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { logger, generateRequestId } from "@/lib/logger";

export async function POST(_req: NextRequest) {
  const requestId = generateRequestId();

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
}
