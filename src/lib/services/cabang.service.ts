import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { z } from "zod";

const createCabangSchema = z.object({
  name: z.string().min(1, "Nama cabang wajib diisi").transform((v) => v.trim()),
  address: z.string().optional().nullable().transform((v) => v?.trim() || null),
  phone: z.string().optional().nullable().transform((v) => v?.trim() || null),
  appName: z.string().optional().default("Kasir App").transform((v) => v.trim()),
});

const updateCabangSchema = z.object({
  name: z.string().min(1).optional().transform((v) => v?.trim()),
  address: z.string().optional().nullable().transform((v) => (v === undefined ? undefined : v?.trim() || null)),
  phone: z.string().optional().nullable().transform((v) => (v === undefined ? undefined : v?.trim() || null)),
  appName: z.string().optional().transform((v) => v?.trim()),
});

export type CreateCabangInput = z.infer<typeof createCabangSchema>;
export type UpdateCabangInput = z.infer<typeof updateCabangSchema>;

export const CabangService = {
  async list() {
    return prisma.cabang.findMany({
      include: {
        _count: { select: { users: true, products: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async getById(id: string) {
    const cabang = await prisma.cabang.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, products: true } },
      },
    });
    if (!cabang) throw new NotFoundError("Cabang");
    return cabang;
  },

  async create(body: unknown) {
    const input = createCabangSchema.parse(body);
    return prisma.cabang.create({ data: input });
  },

  async update(id: string, body: unknown) {
    const existing = await prisma.cabang.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Cabang");

    const input = updateCabangSchema.parse(body);
    return prisma.cabang.update({
      where: { id },
      data: {
        name: input.name ?? existing.name,
        address: input.address !== undefined ? input.address : existing.address,
        phone: input.phone !== undefined ? input.phone : existing.phone,
        appName: input.appName ?? existing.appName,
      },
    });
  },

  async delete(id: string) {
    const existing = await prisma.cabang.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError("Cabang");

    const userCount = await prisma.user.count({ where: { cabangId: id } });
    if (userCount > 0) throw new ConflictError("Cabang masih memiliki user. Pindahkan user terlebih dahulu.");

    const productCount = await prisma.product.count({ where: { cabangId: id } });
    if (productCount > 0) throw new ConflictError("Cabang masih memiliki produk. Hapus produk terlebih dahulu.");

    await prisma.cabang.delete({ where: { id } });
    return { message: "Cabang berhasil dihapus" };
  },
};
