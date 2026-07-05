import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { requireAdmin } from "@/lib/middleware-helpers";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      httpRequestsTotal.inc({ method: "GET", path: "/api/dashboard", status: 403 });
      httpRequestDurationSeconds.observe({ method: "GET", path: "/api/dashboard" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const summary = await DashboardService.getSummary();

    logger.debug({ event: "dashboard.fetched", requestId });

    const response = NextResponse.json(summary);
    httpRequestsTotal.inc({ method: "GET", path: "/api/dashboard", status: response.status });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/dashboard" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/dashboard", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/dashboard" }, duration);
    return handleApiError(error, requestId);
  }
}
