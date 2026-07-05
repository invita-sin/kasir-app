import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { getUser } from "@/lib/get-user";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const cabangId = user.role === "SUPER_ADMIN" ? undefined : user.cabangId!;
    const summary = await DashboardService.getSummary(cabangId);

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
