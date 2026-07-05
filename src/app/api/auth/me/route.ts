import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { logger, generateRequestId } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  const token = req.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const payload = await AuthService.verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  logger.debug({ event: "auth.me", requestId, userId: payload.userId });

  return NextResponse.json({
    id: payload.userId,
    username: payload.username,
    name: payload.name,
    role: payload.role,
  });
}
