import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withApiHandler } from "@/lib/api-handler";
import { UnauthorizedError } from "@/lib/errors";

export const GET = withApiHandler(async (req, _ctx, requestId) => {
  const token = req.cookies.get("token")?.value;
  if (!token) throw new UnauthorizedError("Silakan login terlebih dahulu");

  const payload = await AuthService.verifyToken(token);
  if (!payload) throw new UnauthorizedError("Sesi telah berakhir");

  let cabang = null;
  if (payload.cabangId) {
    cabang = await prisma.cabang.findUnique({
      where: { id: payload.cabangId },
      select: { id: true, name: true, appName: true, address: true, phone: true },
    });
  }

  logger.debug({ event: "auth.me", requestId, userId: payload.userId });

  return NextResponse.json({
    id: payload.userId,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    cabangId: payload.cabangId,
    cabang,
  });
}, "GET", "/api/auth/me");
