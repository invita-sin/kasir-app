import { NextRequest, NextResponse } from "next/server";
import { CabangService } from "@/lib/services/cabang.service";
import { requireSuperAdmin, requireAdmin } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req, ctx) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const cabang = await CabangService.getById(id);

  return NextResponse.json(cabang);
}, "GET", "/api/cabang/[id]");

export const PUT = withApiHandler(async (req, ctx) => {
  const user = await requireSuperAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const cabang = await CabangService.update(id, body);

  logger.info({ event: "cabang.updated", id: cabang.id, name: cabang.name });

  return NextResponse.json(cabang);
}, "PUT", "/api/cabang/[id]");

export const DELETE = withApiHandler(async (req, ctx) => {
  const user = await requireSuperAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await CabangService.delete(id);

  logger.info({ event: "cabang.deleted", id });

  return NextResponse.json(result);
}, "DELETE", "/api/cabang/[id]");
