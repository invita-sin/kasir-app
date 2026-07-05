import { NextRequest, NextResponse } from "next/server";
import { CabangService } from "@/lib/services/cabang.service";
import { requireSuperAdmin } from "@/lib/middleware-helpers";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await requireSuperAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "GET", path: "/api/cabang/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "GET", path: "/api/cabang/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const cabang = await CabangService.getById(id);

    const response = NextResponse.json(cabang);
    httpRequestsTotal.inc({ method: "GET", path: "/api/cabang/[id]", status: 200 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/cabang/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/cabang/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/cabang/[id]" }, duration);
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
    const user = await requireSuperAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "PUT", path: "/api/cabang/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/cabang/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await parseJsonBody(req);
    const cabang = await CabangService.update(id, body);

    logger.info({ event: "cabang.updated", requestId, id: cabang.id, name: cabang.name });

    const response = NextResponse.json(cabang);
    httpRequestsTotal.inc({ method: "PUT", path: "/api/cabang/[id]", status: 200 });
    httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/cabang/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "PUT", path: "/api/cabang/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/cabang/[id]" }, duration);
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
    const user = await requireSuperAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "DELETE", path: "/api/cabang/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/cabang/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await CabangService.delete(id);

    logger.info({ event: "cabang.deleted", requestId, id });

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "DELETE", path: "/api/cabang/[id]", status: 200 });
    httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/cabang/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "DELETE", path: "/api/cabang/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/cabang/[id]" }, duration);
    return handleApiError(error, requestId);
  }
}
