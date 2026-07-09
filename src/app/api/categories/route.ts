import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/lib/services/category.service";
import { requireAdminOrThrow } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await requireAdminOrThrow(req);
  const { searchParams } = new URL(req.url);
  const queryCabangId = searchParams.get("cabangId") || undefined;
  const cabangId = user.role === "SUPER_ADMIN" ? queryCabangId : user.cabangId!;
  const result = await CategoryService.list(cabangId);
  return NextResponse.json(result);
}, "GET", "/api/categories");

export const POST = withApiHandler(async (req) => {
  const user = await requireAdminOrThrow(req);
  const body = await parseJsonBody(req);
  const overrideCabangId = user.role === "ADMIN" ? user.cabangId! : undefined;
  const category = await CategoryService.create(body, overrideCabangId, user.userId);
  logger.info({ event: "category.created", id: category.id, name: category.name });
  return NextResponse.json(category, { status: 201 });
}, "POST", "/api/categories");
