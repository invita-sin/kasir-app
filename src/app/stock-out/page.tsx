"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { apiPost } from "@/lib/api-client";
import Pagination from "@/components/Pagination";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

interface StockOut {
  id: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: Product;
}

interface StockOutResponse {
  data: StockOut[];
  totalPages: number;
}

export default function StockOutPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", note: "" });
  const [page, setPage] = useState(1);

  const { data: itemsData, isLoading, mutate } = useSWR<StockOutResponse>(
    `/api/stock-out?page=${page}&limit=20`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const { data: products } = useSWR<Product[]>("/api/products?all=true", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const items = itemsData?.data || [];

  const selectedProduct = products?.find((p) => p.id === form.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.quantity || Number(form.quantity) < 1) {
      toast.error("Lengkapi form dengan benar");
      return;
    }
    if (selectedProduct && Number(form.quantity) > selectedProduct.stock) {
      toast.error(`Melebihi stok tersedia (${selectedProduct.stock})`);
      return;
    }
    try {
      await apiPost("/api/stock-out", form);
      toast.success("Stok keluar berhasil dicatat");
      setShowForm(false);
      setForm({ productId: "", quantity: "", note: "" });
      mutate();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mencatat stok keluar");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Stok Keluar</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Catat Stok Keluar
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Catat Stok Keluar</h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Produk *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                >
                  <option value="">Pilih produk</option>
                  {products?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - Stok: {p.stock}
                    </option>
                  ))}
                </select>
                {selectedProduct && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Stok saat ini: <strong>{selectedProduct.stock}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jumlah *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catatan</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Misal: rusak, expired, dll"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Tidak ada data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 font-medium">Produk</th>
                <th className="py-3 px-4 font-medium">SKU</th>
                <th className="py-3 px-4 font-medium">Jumlah</th>
                <th className="py-3 px-4 font-medium">Alasan</th>
                <th className="py-3 px-4 font-medium">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-gray-100">{item.product.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{item.product.sku}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-red-600">-{item.quantity}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{item.note || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={itemsData?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
