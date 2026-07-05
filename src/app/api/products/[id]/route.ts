import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/lib/services/product.service";
import { requireAdmin } from "@/lib/middleware-helpers";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const { id } = await params;
    const product = await ProductService.getById(id);

    const response = NextResponse.json(product);
    httpRequestsTotal.inc({ method: "GET", path: "/api/products/[id]", status: response.status });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/products/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/products/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/products/[id]" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      httpRequestsTotal.inc({ method: "PUT", path: "/api/products/[id]", status: 403 });
      httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/products/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await parseJsonBody(req);
    const product = await ProductService.update(id, body);

    logger.info({ event: "product.updated", requestId, id: product.id, sku: product.sku });

    const response = NextResponse.json(product);
    httpRequestsTotal.inc({ method: "PUT", path: "/api/products/[id]", status: response.status });
    httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/products/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "PUT", path: "/api/products/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/products/[id]" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      httpRequestsTotal.inc({ method: "DELETE", path: "/api/products/[id]", status: 403 });
      httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/products/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const result = await ProductService.delete(id);

    logger.info({ event: "product.deleted", requestId, id });

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "DELETE", path: "/api/products/[id]", status: response.status });
    httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/products/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "DELETE", path: "/api/products/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/products/[id]" }, duration);
    return handleApiError(error, requestId);
  }
}
