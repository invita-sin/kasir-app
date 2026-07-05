import { prisma } from "@/lib/prisma";
import { lowStockProducts as lowStockGauge, totalProducts as totalProductsGauge } from "@/lib/metrics";

export const DashboardService = {
  async getSummary(cabangId?: string) {
    const productWhere = cabangId ? { cabangId } : {};

    const [
      totalProductsCount,
      totalSales,
      totalRevenue,
      lowStockProductsData,
      recentSales,
      recentStockIn,
      recentStockOut,
    ] = await Promise.all([
      prisma.product.count({ where: productWhere }),
      prisma.sale.count({ where: cabangId ? { items: { some: { product: { cabangId } } } } : {} }),
      prisma.sale.aggregate({
        _sum: { total: true },
        where: cabangId ? { items: { some: { product: { cabangId } } } } : {},
      }),
      prisma.product.findMany({
        where: { ...productWhere, stock: { lte: prisma.product.fields.minStock } },
        orderBy: { stock: "asc" },
      }),
      prisma.sale.findMany({
        where: cabangId ? { items: { some: { product: { cabangId } } } } : {},
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.stockIn.findMany({
        where: { product: { cabangId } },
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.stockOut.findMany({
        where: { product: { cabangId } },
        include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    totalProductsGauge.set(totalProductsCount);
    lowStockGauge.set(lowStockProductsData.length);

    return {
      totalProducts: totalProductsCount,
      totalSales,
      totalRevenue: totalRevenue._sum.total || 0,
      lowStockProducts: lowStockProductsData.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
      })),
      recentSales,
      recentStockIn,
      recentStockOut,
    };
  },
};
