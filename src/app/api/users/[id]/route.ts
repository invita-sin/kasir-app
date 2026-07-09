import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";
import { requireAuthOrThrow } from "@/lib/middleware-helpers";
import { ForbiddenError } from "@/lib/errors";

async function checkCabangAccess(user: { role: string; cabangId: string | null }, targetUserId: string): Promise<void> {
  if (user.role === "SUPER_ADMIN") return;
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { cabangId: true } });
  if (!target || target.cabangId !== user.cabangId) throw new ForbiddenError("Akses ditolak");
}

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const { id } = await ctx.params;
  await checkCabangAccess(user, id);
  const result = await AuthService.getUser(id);
  return NextResponse.json(result);
}, "GET", "/api/users/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const { id } = await ctx.params;
  await checkCabangAccess(user, id);
  const body = await parseJsonBody(req);
  const result = await AuthService.updateUser(id, body, user.role, user.userId);

  logger.info({ event: "user.updated", id });

  return NextResponse.json(result);
}, "PUT", "/api/users/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const { id } = await ctx.params;
  await checkCabangAccess(user, id);
  await AuthService.deleteUser(id, user.userId);

  logger.info({ event: "user.deleted", id });

  return NextResponse.json({ message: "User berhasil dihapus" });
}, "DELETE", "/api/users/[id]");
