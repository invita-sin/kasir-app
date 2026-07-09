import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/lib/services/category.service";
import { requireAdminOrThrow } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

function getCabangId(user: { role: string; cabangId?: string | null }, req: NextRequest) {
  if (user.role === "SUPER_ADMIN") {
    const { searchParams } = new URL(req.url);
    return searchParams.get("cabangId") || undefined;
  }
  return user.cabangId!;
}

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireAdminOrThrow(req);
  const cabangId = getCabangId(user, req);
  const { id } = await ctx.params;
  const category = await CategoryService.getById(id, cabangId);
  return NextResponse.json(category);
}, "GET", "/api/categories/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await requireAdminOrThrow(req);
  const cabangId = getCabangId(user, req);
  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const category = await CategoryService.update(id, cabangId!, body, user.userId);
  logger.info({ event: "category.updated", id: category.id, name: category.name });
  return NextResponse.json(category);
}, "PUT", "/api/categories/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await requireAdminOrThrow(req);
  const cabangId = getCabangId(user, req);
  const { id } = await ctx.params;
  const result = await CategoryService.delete(id, cabangId!, user.userId);
  logger.info({ event: "category.deleted", id });
  return NextResponse.json(result);
}, "DELETE", "/api/categories/[id]");
