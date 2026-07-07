import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/middleware-helpers";
import { withApiHandler } from "@/lib/api-handler";

export const POST = withApiHandler(async (req) => {
  const user = await requireSuperAdmin(req);
  if (!user) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.stockIn.deleteMany();
  await prisma.stockOut.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany({ where: { role: { not: "SUPER_ADMIN" } } });
  await prisma.user.updateMany({
    where: { role: "SUPER_ADMIN", cabangId: { not: null } },
    data: { cabangId: null },
  });
  await prisma.cabang.deleteMany();

  const remaining = await prisma.user.count();

  return NextResponse.json({
    success: true,
    message: "Semua data dibersihkan, hanya SUPER_ADMIN tersisa",
    superAdminCount: remaining,
  });
}, "POST", "/api/cleanup");
