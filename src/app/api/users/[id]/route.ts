import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/get-user";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

async function checkCabangAccess(user: { role: string; cabangId: string | null }, targetUserId: string): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { cabangId: true } });
  return target !== null && target.cabangId === user.cabangId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await getUser(req);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      httpRequestsTotal.inc({ method: "GET", path: "/api/users/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!(await checkCabangAccess(user, id))) {
      httpRequestsTotal.inc({ method: "GET", path: "/api/users/[id]", status: 403 });
      httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }
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
    const user = await getUser(req);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      httpRequestsTotal.inc({ method: "PUT", path: "/api/users/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!(await checkCabangAccess(user, id))) {
      httpRequestsTotal.inc({ method: "PUT", path: "/api/users/[id]", status: 403 });
      httpRequestDurationSeconds.observe({ method: "PUT", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }
    const body = await parseJsonBody(req);
    const result = await AuthService.updateUser(id, body, user.role);

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
    const user = await getUser(req);
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN")) {
      httpRequestsTotal.inc({ method: "DELETE", path: "/api/users/[id]", status: 401 });
      httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!(await checkCabangAccess(user, id))) {
      httpRequestsTotal.inc({ method: "DELETE", path: "/api/users/[id]", status: 403 });
      httpRequestDurationSeconds.observe({ method: "DELETE", path: "/api/users/[id]" }, (Date.now() - start) / 1000);
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }
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
