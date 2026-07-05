import { NextRequest } from "next/server";
import { AuthService } from "@/lib/services/auth.service";
import type { JwtPayload } from "@/lib/services/auth.service";

export async function getUser(req: NextRequest): Promise<JwtPayload | null> {
  const token = req.cookies.get("token")?.value;
  if (!token) return null;
  return AuthService.verifyToken(token);
}
