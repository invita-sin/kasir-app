import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").transform((v) => v.trim()),
  cabangId: z.string().min(1, "Cabang wajib dipilih"),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional().transform((v) => v?.trim()),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const CategoryService = {
  async list(cabangId: string) {
    return prisma.category.findMany({
      where: { cabangId },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string, cabangId: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });
    if (!category || category.cabangId !== cabangId) throw new NotFoundError("Kategori");
    return category;
  },

  async create(body: unknown) {
    const input = createCategorySchema.parse(body);

    const existing = await prisma.category.findUnique({
      where: { cabangId_name: { cabangId: input.cabangId, name: input.name } },
    });
    if (existing) throw new ConflictError("Kategori dengan nama tersebut sudah ada di cabang ini");

    return prisma.category.create({ data: input });
  },

  async update(id: string, cabangId: string, body: unknown) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.cabangId !== cabangId) throw new NotFoundError("Kategori");

    const input = updateCategorySchema.parse(body);

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({
        where: { cabangId_name: { cabangId, name: input.name } },
      });
      if (duplicate) throw new ConflictError("Kategori dengan nama tersebut sudah ada di cabang ini");
    }

    return prisma.category.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
      },
    });
  },

  async delete(id: string, cabangId: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing || existing.cabangId !== cabangId) throw new NotFoundError("Kategori");

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) throw new ConflictError("Kategori masih memiliki produk. Pindahkan produk terlebih dahulu.");

    await prisma.category.delete({ where: { id } });
    return { message: "Kategori berhasil dihapus" };
  },
};
