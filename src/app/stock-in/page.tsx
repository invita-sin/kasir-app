"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Pagination from "@/components/Pagination";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface StockIn {
  id: string;
  quantity: number;
  note: string | null;
  createdAt: string;
  product: Product;
}

interface FormErrors {
  productId?: string;
  quantity?: string;
}

export default function StockIn() {
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<StockIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", quantity: "", note: "" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchData = useCallback(async () => {
    const [itemsRes, productsRes] = await Promise.all([
      fetch(`/api/stock-in?page=${page}&limit=20`),
      fetch("/api/products?all=true"),
    ]);
    if (itemsRes.ok) {
      const json = await itemsRes.json();
      setItems(json.data || []);
      setTotalPages(json.totalPages || 1);
    }
    setProducts(await productsRes.json());
    setLoading(false);
  }, [page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.productId) errs.productId = "Pilih produk";
    if (!form.quantity || Number(form.quantity) < 1) errs.quantity = "Jumlah minimal 1";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const res = await fetch("/api/stock-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Stok masuk berhasil dicatat");
      setShowForm(false);
      setForm({ productId: "", quantity: "", note: "" });
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Gagal mencatat stok masuk");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Stok Masuk</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Stok
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Tambah Stok Masuk</h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Produk *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => { setForm({ ...form, productId: e.target.value }); setErrors({ ...errors, productId: undefined }); }}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.productId ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                >
                  <option value="">Pilih produk</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                {errors.productId && <p className="mt-1 text-xs text-red-500">{errors.productId}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={form.quantity}
                  onChange={(e) => { setForm({ ...form, quantity: e.target.value }); setErrors({ ...errors, quantity: undefined }); }}
                  className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.quantity ? "border-red-300 bg-red-50" : "border-gray-200"
                  }`}
                />
                {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
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

      {loading ? (
        <div className="text-center py-8 text-gray-500">Memuat...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Tidak ada data</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                <th className="py-3 px-4 font-medium">Produk</th>
                <th className="py-3 px-4 font-medium">SKU</th>
                <th className="py-3 px-4 font-medium">Jumlah</th>
                <th className="py-3 px-4 font-medium">Catatan</th>
                <th className="py-3 px-4 font-medium">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.product.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{item.product.sku}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-blue-600">+{item.quantity}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{item.note || "-"}</td>
                  <td className="py-3 px-4 text-sm text-gray-500">{formatDate(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
