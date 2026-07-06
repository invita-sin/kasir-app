"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import Pagination from "@/components/Pagination";

interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string; sku: string; price: number };
}

interface Sale {
  id: string;
  total: number;
  createdAt: string;
  items: SaleItem[];
}

interface DailySummary {
  date: string;
  count: number;
  revenue: number;
  sales: Sale[];
}

interface DailyResponse {
  data: DailySummary[];
  totalDays: number;
  totalPages: number;
}

function formatDateID(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function TransactionHistory() {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR<DailyResponse>(
    `/api/transactions?groupBy=day&page=${page}&limit=20`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  if (isLoading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;

  const days = data?.data || [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Riwayat Transaksi</h1>

      {days.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Tidak ada transaksi</div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{formatDateID(day.date)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{day.count} transaksi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">{formatRupiah(day.revenue)}</span>
                  {expandedDay === day.date ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </button>
              {expandedDay === day.date && (
                <div className="border-t border-gray-100 dark:border-gray-700">
                  {day.sales.map((sale) => (
                    <div key={sale.id}>
                      <button
                        onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">
                            {new Date(sale.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            #{sale.id.slice(-8).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-green-600">{formatRupiah(sale.total)}</span>
                          {expandedSale === sale.id ? (
                            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </div>
                      </button>
                      {expandedSale === sale.id && (
                        <div className="px-4 py-2 space-y-1.5 bg-gray-50/50 dark:bg-gray-700/20">
                          {sale.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm pl-16">
                              <span className="text-gray-600 dark:text-gray-300">
                                {item.product.name} x{item.quantity}
                              </span>
                              <span className="font-medium text-gray-800 dark:text-gray-200">
                                {formatRupiah(item.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
