import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function hashPassword(password) {
  if (!process.env.PASSWORD_PEPPER) throw new Error("PASSWORD_PEPPER is required");
  const pepper = new TextEncoder().encode(process.env.PASSWORD_PEPPER);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new Uint8Array([...salt, ...pepper]), iterations: 600000, hash: "SHA-256" },
    key, 256
  );
  const saltStr = Array.from(salt, (b) => String.fromCharCode(b)).join("");
  const hashStr = Array.from(new Uint8Array(bits), (b) => String.fromCharCode(b)).join("");
  return Buffer.from(saltStr + hashStr, "binary").toString("base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function main() {
  const cabangCount = await prisma.cabang.count();
  let cabang;
  if (cabangCount === 0) {
    cabang = await prisma.cabang.create({
      data: { name: "Cabang Utama", address: "Jl. Contoh No. 123", phone: "0812-3456-7890", appName: "Kasir App" },
    });
    console.log("Cabang created:", cabang.id);
  } else {
    cabang = await prisma.cabang.findFirst();
  }

  const admin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (admin) {
    await prisma.user.update({ where: { id: admin.id }, data: { role: "SUPER_ADMIN", cabangId: null } });
    console.log("User admin -> SUPER_ADMIN");
  }

  if (!(await prisma.user.findUnique({ where: { username: "admin_cabang" } }))) {
    const pwd = await hashPassword(process.env.ADMIN_PASSWORD || "admin123");
    await prisma.user.create({
      data: { username: "admin_cabang", password: pwd, name: "Admin Cabang", role: "ADMIN", cabangId: cabang.id },
    });
    console.log("admin_cabang created");
  }

  if (!(await prisma.user.findUnique({ where: { username: "kasir" } }))) {
    const pwd = await hashPassword(process.env.KASIR_PASSWORD || "kasir123");
    await prisma.user.create({
      data: { username: "kasir", password: pwd, name: "Kasir Toko", role: "KASIR", cabangId: cabang.id },
    });
    console.log("kasir created");
  }

  const productCount = await prisma.product.count();
  if (productCount === 0) {
    const products = [
      { name: "Kopi Hitam", sku: "KOPI-001", price: 15000, stock: 50, minStock: 10 },
      { name: "Kopi Susu", sku: "KOPI-002", price: 20000, stock: 40, minStock: 10 },
      { name: "Cappuccino", sku: "KOPI-003", price: 25000, stock: 30, minStock: 5 },
      { name: "Teh Manis", sku: "TEH-001", price: 10000, stock: 60, minStock: 15 },
      { name: "Teh Tarik", sku: "TEH-002", price: 18000, stock: 25, minStock: 5 },
      { name: "Air Mineral", sku: "AIR-001", price: 5000, stock: 100, minStock: 20 },
      { name: "Mie Goreng", sku: "MIE-001", price: 12000, stock: 45, minStock: 10 },
      { name: "Nasi Goreng", sku: "NASI-001", price: 25000, stock: 35, minStock: 5 },
      { name: "Kentang Goreng", sku: "KENTANG-001", price: 15000, stock: 20, minStock: 5 },
      { name: "Pisang Goreng", sku: "PISANG-001", price: 10000, stock: 30, minStock: 10 },
      { name: "Roti Bakar", sku: "ROTI-001", price: 12000, stock: 25, minStock: 5 },
      { name: "Jus Jeruk", sku: "JUS-001", price: 15000, stock: 40, minStock: 10 },
    ];
    for (const p of products) {
      await prisma.product.create({ data: { ...p, cabangId: cabang.id } });
    }
    console.log("12 products created");
  }

  console.log("Migration selesai!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
