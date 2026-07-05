import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { getUser } from "@/lib/get-user";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { httpRequestsTotal, httpRequestDurationSeconds } from "@/lib/metrics";
import { parseJsonBody } from "@/lib/request";

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const cabangId = user.role === "SUPER_ADMIN" ? undefined : user.cabangId!;
    const users = await AuthService.listUsers(cabangId);

    const response = NextResponse.json(users);
    httpRequestsTotal.inc({ method: "GET", path: "/api/users", status: 200 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "GET", path: "/api/users", status: 500 });
    httpRequestDurationSeconds.observe({ method: "GET", path: "/api/users" }, duration);
    return handleApiError(error, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const start = Date.now();
  try {
    const user = await getUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await parseJsonBody(req);
    const newUser = await AuthService.createUser(body, user.role);

    logger.info({ event: "user.created", requestId, username: newUser.username, role: newUser.role });

    const response = NextResponse.json(newUser, { status: 201 });
    httpRequestsTotal.inc({ method: "POST", path: "/api/users", status: 201 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/users" }, (Date.now() - start) / 1000);
    return response;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    httpRequestsTotal.inc({ method: "POST", path: "/api/users", status: 500 });
    httpRequestDurationSeconds.observe({ method: "POST", path: "/api/users" }, duration);
    return handleApiError(error, requestId);
  }
}
