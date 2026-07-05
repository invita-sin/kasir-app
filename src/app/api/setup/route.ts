import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const existing = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
  if (existing) {
    return NextResponse.json({ message: "already exists", username: existing.username });
  }

  const { AuthService } = await import("@/lib/services/auth.service");
  const user = await AuthService.createUser({
    username: "super_admin",
    password: process.env.SUPER_ADMIN_PASSWORD || "super123",
    name: "Super Admin",
    role: "SUPER_ADMIN",
  });

  return NextResponse.json({ message: "created", username: user.username });
}
