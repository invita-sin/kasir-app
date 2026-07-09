"use client";

import { useState, useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import { ChevronDown, ChevronUp, CalendarDays, Ban, Download, Store } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import Pagination from "@/components/Pagination";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth-context";

interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  cost: number;
  product: { name: string; sku: string; price: number; cost: number };
}

interface Sale {
  id: string;
  total: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  items: SaleItem[];
}

interface DailySummary {
  date: string;
  count: number;
  revenue: number;
  profit: number;
  sales: Sale[];
}

interface DailyResponse {
  data: DailySummary[];
  totalDays: number;
  totalPages: number;
}

interface CabangOption { id: string; name: string; }

function formatDateID(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

export default function TransactionHistory() {
  const { user } = useAuth();
  const { mutate } = useSWRConfig();
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [cabangFilter, setCabangFilter] = useState("");

  const { data: cabangs } = useSWR<CabangOption[]>(
    user?.role === "SUPER_ADMIN" ? "/api/cabang" : null,
    fetcher
  );

  const queryParams = new URLSearchParams({ groupBy: "day", page: String(page), limit: "20" });
  if (cabangFilter) queryParams.set("cabangId", cabangFilter);

  const { data, isLoading } = useSWR<DailyResponse>(
    `/api/transactions?${queryParams}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const handleVoid = async (saleId: string) => {
    const reason = prompt("Alasan void (wajib diisi):");
    if (!reason || !reason.trim()) return;
    setVoidingId(saleId);
    try {
      const res = await fetch(`/api/transactions/${saleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal void");
      }
      toast.success("Transaksi di-void");
      mutate((key) => typeof key === "string" && (key.startsWith("/api/transactions") || key === "/api/dashboard"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal void");
    }
    setVoidingId(null);
  };

  const canVoid = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const handleExport = useCallback(async () => {
    const params = new URLSearchParams();
    if (cabangFilter) params.set("cabangId", cabangFilter);
    try {
      const res = await fetch(`/api/export/transactions?${params}`);
      if (!res.ok) throw new Error("Gagal export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Gagal mendownload file");
    }
  }, [cabangFilter]);

  if (isLoading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;

  const days = data?.data || [];

  const calcDayProfit = (sales: Sale[]) =>
    sales.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + (i.price - i.cost) * i.quantity, 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Riwayat Transaksi</h1>
        <div className="flex items-center gap-2">
          {user?.role === "SUPER_ADMIN" && (
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={cabangFilter}
                onChange={(e) => { setCabangFilter(e.target.value); setPage(1); }}
                className="pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400 appearance-none bg-white dark:bg-gray-700"
              >
                <option value="">Semua Cabang</option>
                {cabangs?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Tidak ada transaksi</div>
      ) : (
        <div className="space-y-4">
          {days.map((day) => {
            const dayProfit = calcDayProfit(day.sales);
            return (
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
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatRupiah(day.revenue)}</p>
                    <p className="text-xs text-blue-500">{formatRupiah(dayProfit)} laba</p>
                  </div>
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
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">
                            {new Date(sale.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                            #{sale.id.slice(-8).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-green-600">{formatRupiah(sale.total)}</span>
                          {sale.paymentMethod && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 capitalize">
                              {sale.paymentMethod}
                            </span>
                          )}
                          {canVoid && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleVoid(sale.id); }}
                              disabled={voidingId === sale.id}
                              className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 disabled:opacity-30"
                              title="Void transaksi"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
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
          );
          })}
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
