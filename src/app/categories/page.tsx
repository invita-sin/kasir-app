"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Plus, Edit, Trash2, Store } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  _count: { products: number };
}

interface CabangOption { id: string; name: string; }

export default function CategoriesPage() {
  const { user } = useAuth();
  const [cabangFilter, setCabangFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: cabangs } = useSWR<CabangOption[]>(
    user?.role === "SUPER_ADMIN" ? "/api/cabang" : null,
    fetcher
  );

  const queryParams = cabangFilter ? `?cabangId=${cabangFilter}` : "";
  const { data: categories, mutate, isLoading } = useSWR<Category[]>(
    `/api/categories${queryParams}`,
    fetcher
  );

  useEffect(() => {
    if (cabangs?.length && user?.role !== "SUPER_ADMIN") {
      setCabangFilter(user?.cabangId || "");
    }
  }, [user, cabangs]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setShowModal(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setName(cat.name);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/api/categories/${editing.id}`, { name: name.trim() });
        toast.success("Kategori berhasil diperbarui");
      } else {
        await apiPost("/api/categories", { name: name.trim(), cabangId: user?.cabangId || cabangFilter });
        toast.success("Kategori berhasil dibuat");
      }
      setShowModal(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan kategori");
    }
    setSaving(false);
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
    try {
      await apiDelete(`/api/categories/${cat.id}`);
      toast.success("Kategori berhasil dihapus");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kategori");
    }
  };

  if (isLoading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kelola Kategori</h1>
        <div className="flex items-center gap-2">
          {user?.role === "SUPER_ADMIN" && (
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <select
                value={cabangFilter}
                onChange={(e) => setCabangFilter(e.target.value)}
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
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Tambah Kategori
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto dark:bg-gray-800 dark:border-gray-700">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nama</th>
              <th className="text-center px-4 py-3 font-medium">Produk</th>
              <th className="text-center px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories?.map((cat) => (
              <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{cat.name}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{cat._count.products}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {categories?.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  Belum ada kategori
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4 dark:bg-gray-800">
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Kategori" : "Tambah Kategori"}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Kategori</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                placeholder="Nama kategori"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
