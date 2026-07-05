"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit, Trash2, Search, AlertTriangle } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import Pagination from "@/components/Pagination";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  minStock: number;
  description: string | null;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    const res = await fetch(`/api/products?${params}`);
    if (res.ok) {
      const json = await res.json();
      setProducts(json.data || []);
      setTotalPages(json.totalPages || 1);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus produk "${name}"?`)) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Produk berhasil dihapus");
      fetchProducts();
    } else {
      toast.error("Gagal menghapus produk");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Produk</h1>
        <Link
          href="/products/create"
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama atau SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Memuat...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Tidak ada produk</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                <th className="py-3 px-4 font-medium">Nama</th>
                <th className="py-3 px-4 font-medium">SKU</th>
                <th className="py-3 px-4 font-medium">Harga</th>
                <th className="py-3 px-4 font-medium">Stok</th>
                <th className="py-3 px-4 font-medium">Min Stok</th>
                <th className="py-3 px-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800">
                    <div className="flex items-center gap-2">
                      {product.name}
                      {product.stock <= product.minStock && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{product.sku}</td>
                  <td className="py-3 px-4 text-sm font-medium">{formatRupiah(product.price)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-sm font-medium ${
                        product.stock <= product.minStock ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {product.stock}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{product.minStock}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/products/${product.id}/edit`}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
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
