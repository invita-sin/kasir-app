import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/lib/services/category.service";
import { requireAdmin } from "@/lib/middleware-helpers";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cabangId = user.cabangId;
  if (!cabangId) {
    return NextResponse.json({ error: "User tidak memiliki cabang" }, { status: 400 });
  }

  const result = await CategoryService.list(cabangId);

  return NextResponse.json(result);
}, "GET", "/api/categories");

export const POST = withApiHandler(async (req) => {
  const user = await requireAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  const category = await CategoryService.create(body);

  logger.info({ event: "category.created", id: category.id, name: category.name });

  return NextResponse.json(category, { status: 201 });
}, "POST", "/api/categories");
