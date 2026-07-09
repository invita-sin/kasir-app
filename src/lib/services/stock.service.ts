import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { AuditService } from "@/lib/services/audit.service";
import { stockInTotal, stockOutTotal } from "@/lib/metrics";
import { z } from "zod";

const stockInSchema = z.object({
  productId: z.string().min(1, "Produk harus dipilih"),
  quantity: z.coerce.number().int().positive("Jumlah harus angka positif"),
  note: z.string().optional().nullable().transform((v) => v?.trim() || null),
});

const stockOutSchema = z.object({
  productId: z.string().min(1, "Produk harus dipilih"),
  quantity: z.coerce.number().int().positive("Jumlah harus angka positif"),
  note: z.string().optional().nullable().transform((v) => v?.trim() || null),
});

export const StockService = {
  async listStockIn(params: { page?: number; limit?: number; all?: boolean; cabangId: string }) {
    const { all, cabangId } = params;
    const page = all ? 1 : Math.max(1, params.page || 1);
    const limit = all ? 9999 : Math.min(Math.max(1, params.limit || 50), 100);
    const skip = all ? 0 : (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.stockIn.findMany({
        where: { product: { cabangId } },
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockIn.count({ where: { product: { cabangId } } }),
    ]);

    if (all) return data;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async createStockIn(body: unknown, cabangId: string, userId?: string) {
    const input = stockInSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundError("Produk");
    if (product.cabangId !== cabangId) throw new NotFoundError("Produk");

    stockInTotal.inc();

    const [stockIn] = await prisma.$transaction([
      prisma.stockIn.create({
        data: { productId: input.productId, quantity: input.quantity, note: input.note },
      }),
      prisma.product.update({
        where: { id: input.productId },
        data: { stock: { increment: input.quantity } },
      }),
    ]);

    await AuditService.log({
      cabangId,
      userId,
      action: "stock.in",
      entity: "Product",
      entityId: input.productId,
      detail: { quantity: input.quantity, productName: product.name, note: input.note || null },
    });

    return stockIn;
  },

  async listStockOut(params: { page?: number; limit?: number; all?: boolean; cabangId: string }) {
    const { all, cabangId } = params;
    const page = all ? 1 : Math.max(1, params.page || 1);
    const limit = all ? 9999 : Math.min(Math.max(1, params.limit || 50), 100);
    const skip = all ? 0 : (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.stockOut.findMany({
        where: { product: { cabangId } },
        include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.stockOut.count({ where: { product: { cabangId } } }),
    ]);

    if (all) return data;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async createStockOut(body: unknown, cabangId: string, userId?: string) {
    const input = stockOutSchema.parse(body);

    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundError("Produk");
    if (product.cabangId !== cabangId) throw new NotFoundError("Produk");

    if (product.stock < input.quantity) {
      throw new ValidationError(
        `Stok ${product.name} tidak mencukupi. Sisa: ${product.stock}, diminta: ${input.quantity}`
      );
    }

    stockOutTotal.inc();

    const [stockOut] = await prisma.$transaction([
      prisma.stockOut.create({
        data: { productId: input.productId, quantity: input.quantity, note: input.note },
      }),
      prisma.product.update({
        where: { id: input.productId },
        data: { stock: { decrement: input.quantity } },
      }),
    ]);

    await AuditService.log({
      cabangId,
      userId,
      action: "stock.out",
      entity: "Product",
      entityId: input.productId,
      detail: { quantity: input.quantity, productName: product.name, note: input.note || null },
    });

    return stockOut;
  },
};
