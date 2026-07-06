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
  async getDailySummary(params: { cabangId?: string; page?: number; limit?: number }) {
    const { cabangId } = params;
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(Math.max(1, params.limit || 20), 100);
    const skip = (page - 1) * limit;

    let countQuery: string, dataQuery: string, countParams: unknown[], dataParams: unknown[];

    if (cabangId) {
      countQuery = `SELECT COUNT(DISTINCT DATE(s."createdAt")) as count FROM "Sale" s JOIN "SaleItem" si ON si."saleId" = s.id JOIN "Product" p ON p.id = si."productId" AND p."cabangId" = $1`;
      dataQuery = `SELECT DATE(s."createdAt") as date, COUNT(*)::int as count, SUM(s.total) as revenue FROM "Sale" s JOIN "SaleItem" si ON si."saleId" = s.id JOIN "Product" p ON p.id = si."productId" AND p."cabangId" = $1 GROUP BY DATE(s."createdAt") ORDER BY date DESC LIMIT $2 OFFSET $3`;
      countParams = [cabangId];
      dataParams = [cabangId, limit, skip];
    } else {
      countQuery = `SELECT COUNT(DISTINCT DATE(s."createdAt")) as count FROM "Sale" s`;
      dataQuery = `SELECT DATE(s."createdAt") as date, COUNT(*)::int as count, SUM(s.total) as revenue FROM "Sale" s GROUP BY DATE(s."createdAt") ORDER BY date DESC LIMIT $1 OFFSET $2`;
      countParams = [];
      dataParams = [limit, skip];
    }

    const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(countQuery, ...countParams);
    const totalDays = Number(countResult[0]?.count || 0);
    const rows = await prisma.$queryRawUnsafe<{ date: Date; count: bigint; revenue: number }[]>(dataQuery, ...dataParams);

    const dateStrings = rows.map((r) => new Date(r.date).toISOString().split("T")[0]);
    const earliestDate = dateStrings.length ? dateStrings[dateStrings.length - 1] + "T00:00:00" : undefined;

    const sales = earliestDate ? await prisma.sale.findMany({
      where: {
        ...(cabangId ? { items: { some: { product: { cabangId } } } } : {}),
        createdAt: { gte: new Date(earliestDate) },
      },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    }) : [];

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

    const where = cabangId ? { items: { some: { product: { cabangId } } } } : {};

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

    if (all) return { data, total: data.length };
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
