import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/lib/services/stock.service";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";
import { requireAuthOrThrow } from "@/lib/middleware-helpers";
import { ForbiddenError } from "@/lib/errors";

export const GET = withApiHandler(async (req) => {
  const user = await requireAuthOrThrow(req);
  if (!user.cabangId) throw new ForbiddenError("User tidak memiliki cabang");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50);

  const result = await StockService.listStockIn({ page, limit, all, cabangId: user.cabangId });

  return NextResponse.json(result);
}, "GET", "/api/stock-in");

export const POST = withApiHandler(async (req) => {
  const user = await requireAuthOrThrow(req);
  if (!user.cabangId) throw new ForbiddenError("User tidak memiliki cabang");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const body = await parseJsonBody(req);
  const stockIn = await StockService.createStockIn(body, user.cabangId, user.userId);

  logger.info({ event: "stock_in.created", productId: stockIn.productId, quantity: stockIn.quantity });

  return NextResponse.json(stockIn, { status: 201 });
}, "POST", "/api/stock-in");
