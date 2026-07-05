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
  async list(params: { page?: number; limit?: number; all?: boolean }) {
    const { all } = params;
    const page = all ? 1 : Math.max(1, params.page || 1);
    const limit = all ? 9999 : Math.min(Math.max(1, params.limit || 50), 100);
    const skip = all ? 0 : (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.sale.findMany({
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count(),
    ]);

    if (all) return { data, total: data.length };
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async create(body: unknown) {
    const input = createSaleSchema.parse(body);

    const itemsWithProducts = await Promise.all(
      input.items.map(async (item, i) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new NotFoundError(`Item ke-${i + 1}: produk`);

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
