import { NextRequest, NextResponse } from "next/server";
import { generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { handleApiError } from "@/lib/errors";

type RouteHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  requestId: string
) => Promise<NextResponse>;

export function withApiHandler(handler: RouteHandler, method: string, path: string) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const start = Date.now();
    try {
      const response = await handler(req, context, requestId);
      httpRequestsTotal.inc({ method, path, status: response.status });
      httpRequestDurationSeconds.observe({ method, path }, (Date.now() - start) / 1000);
      return response;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      httpRequestsTotal.inc({ method, path, status: 500 });
      httpRequestDurationSeconds.observe({ method, path }, duration);
      return handleApiError(error, requestId);
    }
  };
}
