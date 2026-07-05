import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50);

    const result = await TransactionService.list({ page, limit, all });

    logger.debug({ event: "transactions.list", requestId, all, total: Array.isArray(result) ? result.length : result.total });

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "GET", path: "/api/transactions", status: response.status });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/transactions" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/transactions", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/transactions" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const body = await parseJsonBody(req);
    const sale = await TransactionService.create(body);

    logger.info({ event: "sale.created", requestId, id: sale.id, total: sale.total, items: sale.items.length });

    const response = NextResponse.json(sale, { status: 201 });
    httpRequestsTotal.inc({ method: "POST", path: "/api/transactions", status: 201 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/transactions" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "POST", path: "/api/transactions", status: 500 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/transactions" }, duration);
    return handleApiError(error, requestId);
  }
}
