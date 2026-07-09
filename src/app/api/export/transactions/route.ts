import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrThrow } from "@/lib/middleware-helpers";
import * as XLSX from "xlsx";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req: NextRequest) => {
  const user = await requireAdminOrThrow(req);
  const { searchParams } = new URL(req.url);
  const queryCabangId = user.role === "SUPER_ADMIN" ? (searchParams.get("cabangId") || undefined) : undefined;

  const where: any = { status: "active" };
  const filterCabangId = queryCabangId || user.cabangId;
  if (filterCabangId) {
    where.items = { some: { product: { cabangId: filterCabangId } } };
  }

  const sales = await prisma.sale.findMany({
    where,
    include: { items: { include: { product: { select: { name: true, sku: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  const rows: Record<string, unknown>[] = [];
  for (const sale of sales) {
    for (const item of sale.items) {
      rows.push({
        Tanggal: sale.createdAt.toISOString().split("T")[0],
        ID: sale.id.slice(-8).toUpperCase(),
        "Metode Bayar": sale.paymentMethod,
        Produk: item.product.name,
        SKU: item.product.sku,
        Qty: item.quantity,
        Harga: item.price,
        Modal: item.cost,
        Subtotal: item.price * item.quantity,
      });
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="transactions.xlsx"',
    },
  });
}, "GET", "/api/export/transactions");
