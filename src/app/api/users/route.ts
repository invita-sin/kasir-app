import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { getUser } from "@/lib/get-user";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const cabangId = user.role === "SUPER_ADMIN" ? undefined : user.cabangId!;
  const users = await AuthService.listUsers(cabangId);

  return NextResponse.json(users);
}, "GET", "/api/users");

export const POST = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await parseJsonBody(req);
  const newUser = await AuthService.createUser(body, user.role);

  return NextResponse.json(newUser, { status: 201 });
}, "POST", "/api/users");
