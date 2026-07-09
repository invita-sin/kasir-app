import { NextRequest, NextResponse } from "next/server";
import { CabangService } from "@/lib/services/cabang.service";
import { requireSuperAdminOrThrow, requireAdminOrThrow } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  await requireAdminOrThrow(req);
  const result = await CabangService.list();
  return NextResponse.json(result);
}, "GET", "/api/cabang");

export const POST = withApiHandler(async (req) => {
  const user = await requireSuperAdminOrThrow(req);
  const body = await parseJsonBody(req);
  const cabang = await CabangService.create(body, user.userId);
  logger.info({ event: "cabang.created", id: cabang.id, name: cabang.name });
  return NextResponse.json(cabang, { status: 201 });
}, "POST", "/api/cabang");
