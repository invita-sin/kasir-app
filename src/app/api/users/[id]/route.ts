import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { requireAdmin } from "@/lib/middleware-helpers";
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
    const user = await requireAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "GET", path: "/api/users/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await AuthService.getUser(id);
    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "GET", path: "/api/users/[id]", status: 200 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/users/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users/[id]" }, duration);
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
    const user = await requireAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "PUT", path: "/api/users/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await parseJsonBody(req);
    const result = await AuthService.updateUser(id, body);

    logger.info({ event: "user.updated", requestId, id });

    const response = NextResponse.json(result);
    httpRequestsTotal.inc({ method: "PUT", path: "/api/users/[id]", status: 200 });
    httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "PUT", path: "/api/users/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/users/[id]" }, duration);
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
    const user = await requireAdmin(req);
    if (!user) {
      httpRequestsTotal.inc({ method: "DELETE", path: "/api/users/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await AuthService.deleteUser(id);

    logger.info({ event: "user.deleted", requestId, id });

    const response = NextResponse.json({ message: "User berhasil dihapus" });
    httpRequestsTotal.inc({ method: "DELETE", path: "/api/users/[id]", status: 200 });
    httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "DELETE", path: "/api/users/[id]", status: 500 });
    httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/users/[id]" }, duration);
    return handleApiError(error, requestId);
  }
}
