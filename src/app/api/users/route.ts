import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";
import { requireAuthOrThrow } from "@/lib/middleware-helpers";
import { ForbiddenError } from "@/lib/errors";

export const GET = withApiHandler(async (req) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const cabangId = user.role === "SUPER_ADMIN" ? undefined : user.cabangId!;
  const users = await AuthService.listUsers(cabangId);

  return NextResponse.json(users);
}, "GET", "/api/users");

export const POST = withApiHandler(async (req) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const body = await parseJsonBody(req);
  const newUser = await AuthService.createUser(body, user.role, user.userId);

  return NextResponse.json(newUser, { status: 201 });
}, "POST", "/api/users");
