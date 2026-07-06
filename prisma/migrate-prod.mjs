import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (superAdminCount === 0) {
    throw new Error("Tidak ada SUPER_ADMIN — tidak bisa hapus semua data.");
  }

  console.log("Menghapus SaleItem...");
  await prisma.saleItem.deleteMany();
  console.log("Menghapus Sale...");
  await prisma.sale.deleteMany();
  console.log("Menghapus StockIn...");
  await prisma.stockIn.deleteMany();
  console.log("Menghapus StockOut...");
  await prisma.stockOut.deleteMany();
  console.log("Menghapus Product...");
  await prisma.product.deleteMany();
  console.log("Menghapus non-SUPER_ADMIN User...");
  await prisma.user.deleteMany({ where: { role: { not: "SUPER_ADMIN" } } });
  console.log("Nulling cabangId pada SUPER_ADMIN...");
  await prisma.user.updateMany({
    where: { role: "SUPER_ADMIN", cabangId: { not: null } },
    data: { cabangId: null },
  });
  console.log("Menghapus Cabang...");
  await prisma.cabang.deleteMany();

  const remaining = await prisma.user.count();
  console.log(`Selesai! ${remaining} SUPER_ADMIN tersisa.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
