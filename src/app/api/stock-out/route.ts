import { NextRequest, NextResponse } from "next/server";
import { StockService } from "@/lib/services/stock.service";
import { getUser } from "@/lib/get-user";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
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
    logger.debug({ event: "stock_out.list", requestId, all, total: Array.isArray(result) ? result.length : result.total });

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "GET", path: "/api/stock-out", status: response.status });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/stock-out" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/stock-out", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/stock-out" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await getUser(req);
    if (!user || !user.cabangId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await parseJsonBody(req);
    const stockOut = await StockService.createStockOut(body, user.cabangId);

    logger.info({ event: "stock_out.created", requestId, productId: stockOut.productId, quantity: stockOut.quantity });

    const response = NextResponse.json(stockOut, { status: 201 });
    httpRequestsTotal.inc({ method: "POST", path: "/api/stock-out", status: 201 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/stock-out" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "POST", path: "/api/stock-out", status: 500 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/stock-out" }, duration);
    return handleApiError(error, requestId);
  }
}
