import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/lib/services/product.service";
import { requireAdmin } from "@/lib/middleware-helpers";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const all = searchParams.get("all") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50);

    const result = await ProductService.list({ search, page, limit, all });

    logger.debug({ event: "products.list", requestId, all, total: Array.isArray(result) ? result.length : result.total });

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "GET", path: "/api/products", status: response.status });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/products" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/products", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/products" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      httpRequestsTotal.inc({ method: "POST", path: "/api/products", status: 403 });
      httpRequestDurationSeconds.observe({ method: "POST", path: "/api/products" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await parseJsonBody(req);
    const product = await ProductService.create(body);

    logger.info({ event: "product.created", requestId, sku: product.sku, id: product.id });

    const response = NextResponse.json(product, { status: 201 });
    httpRequestsTotal.inc({ method: "POST", path: "/api/products", status: 201 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/products" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "POST", path: "/api/products", status: 500 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/products" }, duration);
    return handleApiError(error, requestId);
  }
}
