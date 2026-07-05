"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
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

export default function TransactionHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchSales = useCallback(async () => {
    const res = await fetch(`/api/transactions?page=${page}&limit=20`);
    if (res.ok) {
      const json = await res.json();
      setSales(json.data || []);
      setTotalPages(json.totalPages || 1);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  if (loading) return <div className="text-center py-8 text-gray-500">Memuat...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h1>

      {sales.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Tidak ada transaksi</div>
      ) : (
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
              <button
                onClick={() => setExpanded(expanded === sale.id ? null : sale.id)}
                className="w-full flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      #{sale.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(sale.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-green-600">{formatRupiah(sale.total)}</span>
                  {expanded === sale.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>
              {expanded === sale.id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-2">
                  {sale.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
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
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
