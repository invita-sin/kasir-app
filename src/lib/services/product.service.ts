import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { z } from "zod";

const createProductSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi").transform((v) => v.trim()),
  sku: z.string().min(1, "SKU wajib diisi").transform((v) => v.trim().toUpperCase()),
  price: z.coerce.number().positive("Harga harus lebih dari 0"),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  minStock: z.coerce.number().int().min(0).default(0),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional().transform((v) => v?.trim()),
  sku: z.string().min(1).optional().transform((v) => v?.trim().toUpperCase()),
  price: z.coerce.number().positive().optional(),
  description: z.string().optional().nullable().transform((v) => (v === undefined ? undefined : v?.trim() || null)),
  minStock: z.coerce.number().int().min(0).optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const ProductService = {
  async list(params: { search?: string; page?: number; limit?: number; all?: boolean }) {
    const { search, all } = params;
    const page = all ? 1 : Math.max(1, params.page || 1);
    const limit = all ? 9999 : Math.min(Math.max(1, params.limit || 50), 100);
    const skip = all ? 0 : (page - 1) * limit;

    const where = search
      ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] }
      : undefined;

    const [data, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    if (all) return data;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getById(id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundError("Produk");
    return product;
  },

  async create(body: unknown) {
    const input = createProductSchema.parse(body);

    const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
    if (existing) throw new ConflictError(`SKU "${input.sku}" sudah digunakan`);

    return prisma.product.create({
      data: {
        name: input.name,
        sku: input.sku,
        price: input.price,
        description: input.description ?? null,
        minStock: input.minStock,
      },
    });
  },

  async update(id: string, body: unknown) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Produk");

    const input = updateProductSchema.parse(body);

    if (input.sku && input.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({ where: { sku: input.sku } });
      if (skuExists) throw new ConflictError("SKU sudah digunakan");
    }

    return prisma.product.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        sku: input.sku ?? existing.sku,
        price: input.price ?? existing.price,
        description: input.description !== undefined ? input.description : existing.description,
        minStock: input.minStock ?? existing.minStock,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Produk");

    await prisma.$transaction([
      prisma.stockIn.deleteMany({ where: { productId: id } }),
      prisma.stockOut.deleteMany({ where: { productId: id } }),
      prisma.saleItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);

    return { message: "Produk berhasil dihapus" };
  },
};
