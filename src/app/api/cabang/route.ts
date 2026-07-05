import { NextRequest, NextResponse } from "next/server";
import { CabangService } from "@/lib/services/cabang.service";
import { requireSuperAdmin } from "@/lib/middleware-helpers";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await requireSuperAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "GET", path: "/api/cabang", status: 401 });
      httpRequestDurationSeconds.observe({ method: "GET", path: "/api/cabang" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await CabangService.list();

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "GET", path: "/api/cabang", status: response.status });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/cabang" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/cabang", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/cabang" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await requireSuperAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "POST", path: "/api/cabang", status: 401 });
      httpRequestDurationSeconds.observe({ method: "POST", path: "/api/cabang" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await parseJsonBody(req);
    const cabang = await CabangService.create(body);

    logger.info({ event: "cabang.created", requestId, id: cabang.id, name: cabang.name });

    const response = NextResponse.json(cabang, { status: 201 });
    httpRequestsTotal.inc({ method: "POST", path: "/api/cabang", status: 201 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/cabang" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "POST", path: "/api/cabang", status: 500 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/cabang" }, duration);
    return handleApiError(error, requestId);
  }
}
