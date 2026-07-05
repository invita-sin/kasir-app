import { NextRequest } from "next/server";
import { getUser } from "@/lib/get-user";

export async function requireSuperAdmin(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== "SUPER_ADMIN") return null;
  return user;
}

export async function requireAdmin(req: NextRequest) {
  const user = await getUser(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;
  return user;
}

export async function requireAuth(req: NextRequest) {
  return getUser(req);
}
