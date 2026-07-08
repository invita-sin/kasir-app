import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/lib/services/category.service";
import { requireAdmin } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cabangId = user.cabangId;
  if (!cabangId) {
    return NextResponse.json({ error: "User tidak memiliki cabang" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const category = await CategoryService.getById(id, cabangId);

  return NextResponse.json(category);
}, "GET", "/api/categories/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cabangId = user.cabangId;
  if (!cabangId) {
    return NextResponse.json({ error: "User tidak memiliki cabang" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const category = await CategoryService.update(id, cabangId, body);

  logger.info({ event: "category.updated", id: category.id, name: category.name });

  return NextResponse.json(category);
}, "PUT", "/api/categories/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cabangId = user.cabangId;
  if (!cabangId) {
    return NextResponse.json({ error: "User tidak memiliki cabang" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const result = await CategoryService.delete(id, cabangId);

  logger.info({ event: "category.deleted", id });

  return NextResponse.json(result);
}, "DELETE", "/api/categories/[id]");
