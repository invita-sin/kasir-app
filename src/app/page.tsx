"use client";

import { useEffect, useState } from "react";
import {
  Package,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { formatRupiah, formatDate } from "@/lib/utils";

interface DashboardData {
  totalProducts: number;
  totalSales: number;
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
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat data dashboard");
        return res.json();
      })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-gray-500">Memuat...</div>;

  if (!data) return <div className="text-center py-8 text-red-500">Gagal memuat data</div>;

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
      label: "Stok Menipis",
      value: data.lowStockProducts.length,
      icon: AlertTriangle,
      color: "bg-red-500",
      href: "/products",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Penjualan Terbaru
          </h2>
          {data.recentSales.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada penjualan</p>
          ) : (
            <div className="space-y-3">
              {data.recentSales.map((sale) => (
                <div key={sale.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <p className="text-sm font-medium">
                      {sale.items.map((i) => i.product.name).join(", ")}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(sale.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-600">
                    {formatRupiah(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Stok Menipis
          </h2>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">Semua stok aman</p>
          ) : (
            <div className="space-y-3">
              {data.lowStockProducts.slice(0, 5).map((p) => (
                <div key={p.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <p className="text-sm font-medium">{p.name}</p>
                  <span className="text-sm font-semibold text-red-500">
                    {p.stock} / {p.minStock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Stok Masuk Terbaru</h2>
          {data.recentStockIn.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada stok masuk</p>
          ) : (
            <div className="space-y-3">
              {data.recentStockIn.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">+{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Stok Keluar Terbaru</h2>
          {data.recentStockOut.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada stok keluar</p>
          ) : (
            <div className="space-y-3">
              {data.recentStockOut.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                  <div>
                    <p className="text-sm font-medium">{item.product.name}</p>
                    <p className="text-xs text-gray-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">-{item.quantity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
