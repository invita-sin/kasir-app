"use client";

import { useState } from "react";
import useSWR from "swr";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
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

interface SalesResponse {
  data: Sale[];
  totalPages: number;
}

export default function TransactionHistory() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSWR<SalesResponse>(
    `/api/transactions?page=${page}&limit=20`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  if (isLoading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;

  const sales = data?.data || [];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Riwayat Transaksi</h1>

      {sales.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Tidak ada transaksi</div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                      #{sale.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(sale.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">{formatRupiah(sale.total)}</span>
                  {expanded === sale.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </button>
              {expanded === sale.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-2">
                  {sale.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="font-medium">
                        {formatRupiah(item.product.price * item.quantity)}
                      </span>
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
