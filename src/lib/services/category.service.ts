import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { AuditService } from "@/lib/services/audit.service";
import { z } from "zod";

const createCategorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").transform((v) => v.trim()),
  cabangId: z.string().min(1, "Cabang wajib dipilih"),
});

const createCategorySchemaAdmin = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").transform((v) => v.trim()),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional().transform((v) => v?.trim()),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const CategoryService = {
  async list(cabangId?: string) {
    const where = cabangId ? { cabangId } : {};
    return prisma.category.findMany({
      where,
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string, cabangId?: string) {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });
    if (!category) throw new NotFoundError("Kategori");
    if (cabangId && category.cabangId !== cabangId) throw new NotFoundError("Kategori");
    return category;
  },

  async create(body: unknown, overrideCabangId?: string, userId?: string) {
    let cabangId: string;
    let name: string;
    if (overrideCabangId) {
      const input = createCategorySchemaAdmin.parse(body);
      name = input.name;
      cabangId = overrideCabangId;
    } else {
      const input = createCategorySchema.parse(body);
      name = input.name;
      cabangId = input.cabangId;
    }

    const existing = await prisma.category.findUnique({
      where: { cabangId_name: { cabangId, name } },
    });
    if (existing) throw new ConflictError("Kategori dengan nama tersebut sudah ada di cabang ini");

    const category = await prisma.category.create({ data: { name, cabangId } });

    await AuditService.log({
      cabangId,
      userId,
      action: "category.create",
      entity: "Category",
      entityId: category.id,
      detail: { name },
    });

    return category;
  },

  async update(id: string, cabangId: string, body: unknown, userId?: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Kategori");
    if (existing.cabangId !== cabangId) throw new NotFoundError("Kategori");

    const input = updateCategorySchema.parse(body);

    if (input.name && input.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({
        where: { cabangId_name: { cabangId, name: input.name } },
      });
      if (duplicate) throw new ConflictError("Kategori dengan nama tersebut sudah ada di cabang ini");
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
      },
    });

    await AuditService.log({
      cabangId,
      userId,
      action: "category.update",
      entity: "Category",
      entityId: id,
      detail: { oldName: existing.name, newName: category.name },
    });

    return category;
  },

  async delete(id: string, cabangId: string, userId?: string) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Kategori");
    if (existing.cabangId !== cabangId) throw new NotFoundError("Kategori");

    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) throw new ConflictError("Kategori masih memiliki produk. Pindahkan produk terlebih dahulu.");

    await prisma.category.delete({ where: { id } });

    await AuditService.log({
      cabangId,
      userId,
      action: "category.delete",
      entity: "Category",
      entityId: id,
      detail: { name: existing.name },
    });

    return { message: "Kategori berhasil dihapus" };
  },
};
