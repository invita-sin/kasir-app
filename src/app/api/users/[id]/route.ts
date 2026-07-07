import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/get-user";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

async function checkCabangAccess(user: { role: string; cabangId: string | null }, targetUserId: string): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { cabangId: true } });
  return target !== null && target.cabangId === user.cabangId;
}

export const GET = withApiHandler(async (req, ctx) => {
  const user = await getUser(req);
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!(await checkCabangAccess(user, id))) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  const result = await AuthService.getUser(id);
  return NextResponse.json(result);
}, "GET", "/api/users/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await getUser(req);
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!(await checkCabangAccess(user, id))) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  const body = await parseJsonBody(req);
  const result = await AuthService.updateUser(id, body, user.role);

  logger.info({ event: "user.updated", id });

  return NextResponse.json(result);
}, "PUT", "/api/users/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await getUser(req);
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!(await checkCabangAccess(user, id))) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }
  await AuthService.deleteUser(id);

  logger.info({ event: "user.deleted", id });

  return NextResponse.json({ message: "User berhasil dihapus" });
}, "DELETE", "/api/users/[id]");
