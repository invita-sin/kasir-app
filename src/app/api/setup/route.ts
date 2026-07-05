import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { config } from "@/lib/config";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (key !== config.JWT_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    return NextResponse.json({ message: "SUPER_ADMIN already exists", username: existing.username });
  }

  const { AuthService } = await import("@/lib/services/auth.service");
  const user = await AuthService.createUser({
    username: "super_admin",
    password: process.env.SUPER_ADMIN_PASSWORD || "super123",
    name: "Super Admin",
    role: "SUPER_ADMIN",
  });

  return NextResponse.json({ message: "SUPER_ADMIN created", username: user.username });
}
