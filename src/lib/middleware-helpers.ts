import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import type { JwtPayload } from "@/lib/services/auth.service";

export async function requireAdmin(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "ADMIN") return null;
  return payload;
}
