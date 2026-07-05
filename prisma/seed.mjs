import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function btoa(str) {
  return Buffer.from(str, "binary").toString("base64");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  if (!process.env.PASSWORD_PEPPER) throw new Error("PASSWORD_PEPPER is required");
  const pepper = new TextEncoder().encode(process.env.PASSWORD_PEPPER);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new Uint8Array([...salt, ...pepper]), iterations: 600000, hash: "SHA-256" },
    key,
    256
  );
  const saltStr = Array.from(salt, (b) => String.fromCharCode(b)).join("");
  const hashStr = Array.from(new Uint8Array(bits), (b) => String.fromCharCode(b)).join("");
  return btoa(saltStr + hashStr).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

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

async function main() {
  if (!process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is required");
  if (!process.env.ADMIN_USERNAME) throw new Error("ADMIN_USERNAME is required");
  if (!process.env.KASIR_PASSWORD) throw new Error("KASIR_PASSWORD is required");

  const superAdminPassword = await hashPassword(process.env.ADMIN_PASSWORD);
  const adminPassword = process.env.ADMIN_CABANG_PASSWORD
    ? await hashPassword(process.env.ADMIN_CABANG_PASSWORD)
    : await hashPassword(process.env.ADMIN_PASSWORD);
  const kasirPassword = await hashPassword(process.env.KASIR_PASSWORD);

  const cabang = await prisma.cabang.create({
    data: {
      name: "Cabang Utama",
      address: "Jl. Contoh No. 123",
      phone: "0812-3456-7890",
      appName: "Kasir App",
    },
  });

  await prisma.user.create({
    data: {
      username: process.env.ADMIN_USERNAME,
      password: superAdminPassword,
      name: "Super Administrator",
      role: "SUPER_ADMIN",
    },
  });

  await prisma.user.create({
    data: {
      username: "admin_cabang",
      password: adminPassword,
      name: "Admin Cabang",
      role: "ADMIN",
      cabangId: cabang.id,
    },
  });

  await prisma.user.create({
    data: {
      username: "kasir",
      password: kasirPassword,
      name: "Kasir Toko",
      role: "KASIR",
      cabangId: cabang.id,
    },
  });

  for (const product of products) {
    await prisma.product.create({ data: { ...product, cabangId: cabang.id } });
  }

  console.log("Seed berhasil! SUPER_ADMIN, ADMIN, KASIR + 1 cabang + 12 produk dibuat.");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
