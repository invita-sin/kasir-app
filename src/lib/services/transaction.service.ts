import { prisma } from "@/lib/prisma";
import { ValidationError, NotFoundError } from "@/lib/errors";
import { salesCreatedTotal, salesRevenueTotal } from "@/lib/metrics";
import { z } from "zod";

const saleItemSchema = z.object({
  productId: z.string().min(1, "Produk harus dipilih"),
  quantity: z.coerce.number().int().positive("Jumlah harus angka positif"),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Minimal 1 item diperlukan"),
});

export const TransactionService = {
  async voidSale(id: string, cabangId: string, reason?: string) {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, cabangId: true, stock: true } } },
        },
      },
    });
    if (!sale) throw new NotFoundError("Transaksi");
    if (sale.status !== "active") throw new ValidationError("Transaksi sudah di-void sebelumnya");
    if (sale.items[0]?.product.cabangId !== cabangId) throw new NotFoundError("Transaksi");

    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: "voided", voidedAt: new Date(), voidedReason: reason || null },
      });
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    return { message: "Transaksi berhasil di-void" };
  },

  async getDailySummary(params: { cabangId?: string; page?: number; limit?: number }) {
    const { cabangId } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    const statusClause = `s.status = 'active'`;
    const existsClause = cabangId
      ? `WHERE ${statusClause} AND EXISTS (SELECT 1 FROM "SaleItem" si JOIN "Product" p ON p.id = si."productId" WHERE si."saleId" = s.id AND p."cabangId" = $1)`
      : `WHERE ${statusClause}`;
    const existsParam = cabangId ? [cabangId] : [];

    const countQuery = `SELECT COUNT(DISTINCT DATE(s."createdAt")) as count FROM "Sale" s ${existsClause}`;
    const dataQuery = `SELECT DATE(s."createdAt") as date, COUNT(*)::int as count, SUM(s.total) as revenue FROM "Sale" s ${existsClause} GROUP BY DATE(s."createdAt") ORDER BY date DESC LIMIT ${cabangId ? "$2" : "$1"} OFFSET ${cabangId ? "$3" : "$2"}`;

    const [countResult, rows] = await Promise.all([
      prisma.$queryRawUnsafe<{ count: bigint }[]>(countQuery, ...existsParam),
      prisma.$queryRawUnsafe<{ date: Date; count: bigint; revenue: number }[]>(dataQuery, ...existsParam, limit, skip),
    ]);

    const totalDays = Number(countResult[0]?.count || 0);

    const dateStrings = rows.map((r) => new Date(r.date).toISOString().split("T")[0]);
    const dateBounds = dateStrings.length
      ? { earliest: dateStrings[dateStrings.length - 1] + "T00:00:00", latest: dateStrings[0] + "T23:59:59.999Z" }
      : undefined;

    let sales: any[] = [];
    if (dateBounds) {
      const where: Record<string, unknown> = {
        status: "active",
        createdAt: { gte: new Date(dateBounds.earliest), lte: new Date(dateBounds.latest) },
      };
      if (cabangId) where.items = { some: { product: { cabangId } } };
      sales = await prisma.sale.findMany({
        where: where as any,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
      });
    }

    const grouped = new Map<string, { date: string; count: number; revenue: number; sales: typeof sales }>();
    for (const r of rows) {
      const key = new Date(r.date).toISOString().split("T")[0];
      grouped.set(key, { date: key, count: Number(r.count), revenue: Number(r.revenue), sales: [] });
    }
    for (const s of sales) {
      const key = new Date(s.createdAt).toISOString().split("T")[0];
      const day = grouped.get(key);
      if (day) day.sales.push(s);
    }

    return {
      data: Array.from(grouped.values()).sort((a, b) => b.date.localeCompare(a.date)),
      totalDays,
      page,
      limit,
      totalPages: Math.ceil(totalDays / limit),
    };
  },

  async list(params: { page?: number; limit?: number; all?: boolean; cabangId?: string }) {
    const { all, cabangId } = params;
    const page = all ? 1 : Math.max(1, params.page || 1);
    const limit = all ? 9999 : Math.min(Math.max(1, params.limit || 50), 100);
    const skip = all ? 0 : (page - 1) * limit;

    const where: any = { status: "active" };
    if (cabangId) where.items = { some: { product: { cabangId } } };

    const [data, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    if (all) return data;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async create(body: unknown, cabangId: string) {
    const input = createSaleSchema.parse(body);

    const itemsWithProducts = await Promise.all(
      input.items.map(async (item, i) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundError(`Item ke-${i + 1}: produk`);
        if (product.cabangId !== cabangId) throw new NotFoundError(`Item ke-${i + 1}: produk`);

        if (product.stock < item.quantity) {
          throw new ValidationError(
            `Stok ${product.name} tidak mencukupi (sisa: ${product.stock}, diminta: ${item.quantity})`
          );
        }

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          cost: product.cost,
        };
      })
    );

    const total = itemsWithProducts.reduce((sum, item) => sum + item.price * item.quantity, 0);

    salesCreatedTotal.inc();
    salesRevenueTotal.inc(total);

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          total,
          items: {
              create: itemsWithProducts.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                cost: item.cost,
              })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of newSale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newSale;
    });

    return sale;
  },
};
