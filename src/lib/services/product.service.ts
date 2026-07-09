import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/lib/services/audit.service";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").transform((v) => v.trim()),
  sku: z.string().min(1, "SKU wajib diisi").transform((v) => v.trim().toUpperCase()),
  price: z.coerce.number().positive("Harga harus lebih dari 0"),
  cost: z.coerce.number().min(0).default(0),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  minStock: z.coerce.number().int().min(0).default(0),
  cabangId: z.string().optional(),
  categoryId: z.string().optional().nullable(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional().transform((v) => v?.trim()),
  sku: z.string().min(1).optional().transform((v) => v?.trim().toUpperCase()),
  price: z.coerce.number().positive().optional(),
  cost: z.coerce.number().min(0).optional(),
  description: z.string().optional().nullable().transform((v) => (v === undefined ? undefined : v?.trim() || null)),
  minStock: z.coerce.number().int().min(0).optional(),
  categoryId: z.string().optional().nullable(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const ProductService = {
  async list(params: { search?: string; page?: number; limit?: number; all?: boolean; cabangId?: string | null }) {
    const { search, all, cabangId } = params;
    const page = all ? 1 : Math.max(1, params.page || 1);
    const limit = all ? 9999 : Math.min(Math.max(1, params.limit || 50), 100);
    const skip = all ? 0 : (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (cabangId) where.cabangId = cabangId;
    if (search) {
      where.OR = [{ name: { contains: search } }, { sku: { contains: search } }];
    }

    const include = { cabang: { select: { id: true, name: true } }, category: { select: { id: true, name: true } } };

    const [data, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: where as any,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include,
      }),
      prisma.product.count({ where: where as any }),
    ]);

    if (all) return data;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string, cabangId: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Produk");
    if (product.cabangId !== cabangId) throw new NotFoundError("Produk");
    return product;
  },

  async create(body: unknown, userCabangId: string, creatorRole?: string, userId?: string) {
    const input = createProductSchema.parse(body);
    const targetCabangId = creatorRole === "SUPER_ADMIN" && input.cabangId ? input.cabangId : userCabangId;

    const existing = await prisma.product.findUnique({ where: { cabangId_sku: { cabangId: targetCabangId, sku: input.sku } } });
    if (existing) throw new ConflictError(`SKU "${input.sku}" sudah digunakan di cabang ini`);

    const product = await prisma.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        price: input.price,
        cost: input.cost,
        description: input.description ?? null,
        minStock: input.minStock,
        cabangId: targetCabangId,
        categoryId: input.categoryId || null,
      },
    });

    await AuditService.log({
      cabangId: targetCabangId,
      userId,
      action: "product.create",
      entity: "Product",
      entityId: product.id,
      detail: { name: product.name, sku: product.sku, price: product.price },
    });

    return product;
  },

  async update(id: string, body: unknown, cabangId: string, userId?: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Produk");
    if (existing.cabangId !== cabangId) throw new NotFoundError("Produk");

    const input = updateProductSchema.parse(body);

    if (input.sku && input.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({ where: { cabangId_sku: { cabangId, sku: input.sku } } });
      if (skuExists) throw new ConflictError("SKU sudah digunakan di cabang ini");
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        sku: input.sku ?? existing.sku,
        price: input.price ?? existing.price,
        cost: input.cost !== undefined ? input.cost : existing.cost,
        description: input.description !== undefined ? input.description : existing.description,
        minStock: input.minStock ?? existing.minStock,
        categoryId: input.categoryId !== undefined ? input.categoryId : existing.categoryId,
      },
    });

    await AuditService.log({
      cabangId,
      userId,
      action: "product.update",
      entity: "Product",
      entityId: product.id,
      detail: { name: product.name },
    });

    return product;
  },

  async delete(id: string, cabangId: string, userId?: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Produk");
    if (existing.cabangId !== cabangId) throw new NotFoundError("Produk");

    await prisma.$transaction([
      prisma.stockIn.deleteMany({ where: { productId: id } }),
      prisma.stockOut.deleteMany({ where: { productId: id } }),
      prisma.saleItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    await AuditService.log({
      cabangId,
      userId,
      action: "product.delete",
      entity: "Product",
      entityId: id,
      detail: { name: existing.name, sku: existing.sku },
    });

    return { message: "Produk berhasil dihapus" };
  },
};
