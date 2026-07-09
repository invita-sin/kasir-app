import { prisma } from "@/lib/prisma";
import { cache } from "@/lib/cache";
import { lowStockProducts as lowStockGauge, totalProducts as totalProductsGauge } from "@/lib/metrics";

export const DashboardService = {
  async getSummary(cabangId?: string, startDate?: string, endDate?: string) {
    const cacheKey = `dashboard:${cabangId || "all"}:${startDate || ""}:${endDate || ""}`;
    const productWhere = cabangId ? { cabangId } : {};

    const dateFilter = (startDate || endDate) ? {
      createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      }
    } : {};

    const [
      totalProductsCount,
      totalSales,
      totalRevenue,
      lowStockProductsData,
      recentSales,
      recentStockIn,
      recentStockOut,
      topProducts,
    ] = await Promise.all([
      prisma.product.count({ where: { ...productWhere, ...dateFilter } }),
      prisma.sale.count({ where: { status: "active", ...dateFilter, ...(cabangId ? { items: { some: { product: { cabangId } } } } : {}) } }),
      prisma.sale.aggregate({
        _sum: { total: true },
        where: { status: "active", ...dateFilter, ...(cabangId ? { items: { some: { product: { cabangId } } } } : {}) },
      }),
      prisma.product.findMany({
        where: { ...productWhere, stock: { lte: prisma.product.fields.minStock }, ...dateFilter },
        orderBy: { stock: "asc" },
      }),
      prisma.sale.findMany({
        where: { status: "active", ...dateFilter, ...(cabangId ? { items: { some: { product: { cabangId } } } } : {}) },
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
      (async () => {
        const groups = await prisma.saleItem.groupBy({
          by: ["productId"],
          _sum: { quantity: true },
          where: { sale: { status: "active", ...dateFilter }, ...(cabangId ? { product: { cabangId } } : {}) },
          orderBy: { _sum: { quantity: "desc" } },
          take: 10,
        });
        const productIds = groups.map(g => g.productId);
        const products = productIds.length ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true },
        }) : [];
        const productMap = new Map(products.map(p => [p.id, p.name]));
        return groups.map((g, i) => ({
          rank: i + 1,
          productId: g.productId,
          name: productMap.get(g.productId) || "Unknown",
          totalSold: g._sum.quantity || 0,
        }));
      })(),
    ]);

    totalProductsGauge.set(totalProductsCount);
    lowStockGauge.set(lowStockProductsData.length);

    let profitSql = `SELECT COALESCE(SUM((si.price - si.cost) * si.quantity), 0) as profit FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"`;
    const profitParams: any[] = [];

    if (cabangId) {
      profitSql += ` JOIN "Product" p ON p.id = si."productId" WHERE s.status = 'active' AND p."cabangId" = $1`;
      profitParams.push(cabangId);
    } else {
      profitSql += ` WHERE s.status = 'active'`;
    }

    if (startDate) {
      profitSql += ` AND s."createdAt" >= $${profitParams.length + 1}`;
      profitParams.push(new Date(startDate));
    }
    if (endDate) {
      profitSql += ` AND s."createdAt" <= $${profitParams.length + 1}`;
      profitParams.push(new Date(endDate));
    }

    const profitResult = await prisma.$queryRawUnsafe<{ profit: number }[]>(profitSql, ...profitParams);
    const totalProfit = Number(profitResult[0]?.profit || 0);

    const result = {
      totalProducts: totalProductsCount,
      totalSales,
      totalProfit,
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
      topProducts,
    };

    cache.set(cacheKey, result, 15000);

    return result;
  },
};
