"use client";

import useSWR from "swr";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  PiggyBank,
} from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import RevenueChart from "@/components/RevenueChart";

interface TopProduct {
  rank: number;
  productId: string;
  name: string;
  totalSold: number;
}

interface DashboardData {
  totalProducts: number;
  totalSales: number;
  totalProfit: number;
  totalRevenue: number;
  lowStockProducts: { id: string; name: string; stock: number; minStock: number }[];
  recentSales: {
    id: string;
    total: number;
    createdAt: string;
    items: { product: { name: string }; quantity: number }[];
  }[];
  recentStockIn: {
    id: string;
    quantity: number;
    createdAt: string;
    product: { name: string };
  }[];
  recentStockOut: {
    id: string;
    quantity: number;
    createdAt: string;
    product: { name: string };
  }[];
  topProducts: TopProduct[];
}

export default function Dashboard() {
  const { data, error, isLoading } = useSWR<DashboardData>("/api/dashboard", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
  });

  const { data: chartData } = useSWR<{ data: { date: string; count: number; revenue: number }[] }>(
    "/api/transactions?groupBy=day&page=1&limit=7",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  if (isLoading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;

  if (error || !data) return <div className="text-center py-8 text-red-500">Gagal memuat data</div>;

  const cards = [
    {
      label: "Total Produk",
      value: data.totalProducts,
      icon: Package,
      color: "bg-blue-500",
      href: "/products",
    },
    {
      label: "Total Penjualan",
      value: data.totalSales,
      icon: ShoppingCart,
      color: "bg-green-500",
      href: "/transactions/history",
    },
    {
      label: "Total Pendapatan",
      value: formatRupiah(data.totalRevenue),
      icon: DollarSign,
      color: "bg-purple-500",
      href: "/transactions/history",
    },
    {
      label: "Total Laba",
      value: formatRupiah(data.totalProfit),
      icon: PiggyBank,
      color: "bg-teal-500",
      href: "/transactions/history",
    },
    {
      label: "Stok Menipis",
      value: data.lowStockProducts.length,
      icon: AlertTriangle,
      color: "bg-red-500",
      href: "/products",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {chartData?.data && chartData.data.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Pendapatan 7 Hari Terakhir
          </h2>
          <RevenueChart data={chartData.data.map((d) => ({ date: d.date, revenue: d.revenue }))} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Penjualan Terbaru
          </h2>
          {data.recentSales.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Belum ada penjualan</p>
          ) : (
            <div className="space-y-3">
              {data.recentSales.map((sale) => (
                <div key={sale.id} className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-2">
                  <div>
                    <p className="text-sm font-medium dark:text-gray-200">
                      {sale.items.map((i) => i.product.name).join(", ")}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(sale.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatRupiah(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Stok Menipis
          </h2>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Semua stok aman</p>
          ) : (
            <div className="space-y-3">
              {data.lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-2">
                  <p className="text-sm font-medium dark:text-gray-200">{p.name}</p>
                  <span className="text-sm font-semibold text-red-500">
                    {p.stock} / {p.minStock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Stok Masuk Terbaru</h2>
          {data.recentStockIn.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Belum ada stok masuk</p>
          ) : (
            <div className="space-y-3">
              {data.recentStockIn.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-2">
                  <div>
                    <p className="text-sm font-medium dark:text-gray-200">{item.product.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">+{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Menu Favorit
          </h2>
          {data.topProducts.length === 0 ? (
            <p className="text-gray-400 dark:text-gray-500 text-sm">Belum ada data penjualan</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((product) => (
                <div key={product.productId} className="flex justify-between items-center border-b border-gray-50 dark:border-gray-700 pb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${product.rank <= 3 ? 'bg-amber-500' : 'bg-gray-400 dark:bg-gray-500'}`}>
                      {product.rank}
                    </span>
                    <p className="text-sm font-medium dark:text-gray-200">{product.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{product.totalSold} terjual</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
