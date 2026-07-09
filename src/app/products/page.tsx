"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Edit, Trash2, Search, AlertTriangle, Folder, Store } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/lib/auth-context";
import Pagination from "@/components/Pagination";
import toast from "react-hot-toast";

interface CabangInfo { id: string; name: string; }
interface CategoryInfo { id: string; name: string; }
interface CabangOption { id: string; name: string; }
interface Product {
  id: string; name: string; sku: string; price: number; cost: number;
  stock: number; minStock: number; description: string | null;
  cabang?: CabangInfo;
  category?: CategoryInfo;
}

interface ProductsResponse {
  data: Product[];
  totalPages: number;
}

export default function Products() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cabangFilter, setCabangFilter] = useState("");

  const { data: cabangs } = useSWR<CabangOption[]>(
    user?.role === "SUPER_ADMIN" ? "/api/cabang" : null,
    fetcher
  );

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  if (cabangFilter) params.set("cabangId", cabangFilter);

  const { data, isLoading, mutate } = useSWR<ProductsResponse>(
    `/api/products?${params}`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  );

  const products = data?.data || [];

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus");
      toast.success("Produk berhasil dihapus");
      mutate();
    } catch {
      toast.error("Gagal menghapus produk");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Produk</h1>
        <Link
          href="/products/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk
        </Link>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Cari produk..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
          />
        </div>
        {user?.role === "SUPER_ADMIN" && (
          <div className="relative shrink-0">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <select
              value={cabangFilter}
              onChange={(e) => { setCabangFilter(e.target.value); setPage(1); }}
              className="pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400 appearance-none bg-white dark:bg-gray-700"
            >
              <option value="">Semua Cabang</option>
              {cabangs?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Tidak ada produk</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 min-w-[640px] dark:bg-gray-800 dark:border-gray-700">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 font-medium">Produk</th>
                <th className="py-3 px-4 font-medium">Harga Jual</th>
                <th className="py-3 px-4 font-medium">Modal</th>
                <th className="py-3 px-4 font-medium">Stok</th>
                <th className="py-3 px-4 font-medium hidden sm:table-cell">Min Stok</th>
                <th className="py-3 px-4 font-medium hidden md:table-cell">Cabang</th>
                <th className="py-3 px-4 font-medium text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{product.name}</span>
                      {product.stock <= product.minStock && (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{product.sku}</span>
                      {product.category && (
                        <>
                          <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{product.category.name}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {formatRupiah(product.price)}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {product.cost ? formatRupiah(product.cost) : "-"}
                  </td>
                  <td className={`py-3 px-4 text-sm font-semibold ${
                    product.stock <= product.minStock ? "text-red-600" : "text-green-600"
                  }`}>
                    {product.stock}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell dark:text-gray-400">{product.minStock}</td>
                  <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell dark:text-gray-400">
                    {product.cabang?.name || "-"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} totalPages={data?.totalPages || 1} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
