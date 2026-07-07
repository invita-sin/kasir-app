import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/lib/services/stock.service";
import { getUser } from "@/lib/get-user";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user || !user.cabangId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50);

  const result = await StockService.listStockOut({ page, limit, all, cabangId: user.cabangId });

  return NextResponse.json(result);
}, "GET", "/api/stock-out");

export const POST = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user || !user.cabangId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await parseJsonBody(req);
  const stockOut = await StockService.createStockOut(body, user.cabangId);

  logger.info({ event: "stock_out.created", productId: stockOut.productId, quantity: stockOut.quantity });

  return NextResponse.json(stockOut, { status: 201 });
}, "POST", "/api/stock-out");
