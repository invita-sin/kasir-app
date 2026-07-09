import { NextRequest } from "next/server";
import { getUser } from "@/lib/get-user";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export async function requireSuperAdmin(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

export async function requireSuperAdminOrThrow(req: NextRequest) {
  const user = await requireSuperAdmin(req);
  if (!user) throw new ForbiddenError("Akses hanya untuk Super Admin");
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await getUser(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function requireAdminOrThrow(req: NextRequest) {
  const user = await requireAdmin(req);
  if (!user) throw new UnauthorizedError("Silakan login terlebih dahulu");
  return user;
}

export async function requireAuth(req: NextRequest) {
  return getUser(req);
}

export async function requireAuthOrThrow(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) throw new UnauthorizedError("Silakan login terlebih dahulu");
  return user;
}
