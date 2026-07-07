import { NextRequest, NextResponse } from "next/server";
import { CabangService } from "@/lib/services/cabang.service";
import { requireSuperAdmin, requireAdmin } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await CabangService.list();

  return NextResponse.json(result);
}, "GET", "/api/cabang");

export const POST = withApiHandler(async (req) => {
  const user = await requireSuperAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  const cabang = await CabangService.create(body);

  logger.info({ event: "cabang.created", id: cabang.id, name: cabang.name });

  return NextResponse.json(cabang, { status: 201 });
}, "POST", "/api/cabang");
