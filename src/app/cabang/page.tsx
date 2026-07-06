"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import toast from "react-hot-toast";

interface Cabang {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  appName: string;
  _count: { users: number; products: number };
}

export default function CabangPage() {
  const [cabangList, setCabangList] = useState<Cabang[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const mountedRef = useRef(true);
  const [editing, setEditing] = useState<Cabang | null>(null);
  const [form, setForm] = useState({ name: "", address: "", phone: "", appName: "Kasir App" });
  const [saving, setSaving] = useState(false);

  const fetchCabang = async () => {
    try {
      const data = await apiGet<Cabang[]>("/api/cabang");
      if (mountedRef.current) setCabangList(data);
    } catch {
      if (mountedRef.current) toast.error("Gagal memuat data cabang");
    }
    if (mountedRef.current) setLoading(false);
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchCabang();
    return () => { mountedRef.current = false; };
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", address: "", phone: "", appName: "Kasir App" });
    setShowModal(true);
  };

  const openEdit = (cabang: Cabang) => {
    setEditing(cabang);
    setForm({ name: cabang.name, address: cabang.address || "", phone: cabang.phone || "", appName: cabang.appName });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Nama cabang wajib diisi");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await apiPut(`/api/cabang/${editing.id}`, form);
        toast.success("Cabang berhasil diperbarui");
      } else {
        await apiPost("/api/cabang", form);
        toast.success("Cabang berhasil dibuat");
      }
      setShowModal(false);
      fetchCabang();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan cabang");
    }
    setSaving(false);
  };

  const handleDelete = async (cabang: Cabang) => {
    if (!confirm(`Hapus cabang "${cabang.name}"?`)) return;
    try {
      await apiDelete(`/api/cabang/${cabang.id}`);
      toast.success("Cabang berhasil dihapus");
      fetchCabang();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus cabang");
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kelola Cabang</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah Cabang
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto dark:bg-gray-800 dark:border-gray-700">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Nama</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Nama Aplikasi</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Alamat</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Telepon</th>
              <th className="text-center px-4 py-3 font-medium">User</th>
              <th className="text-center px-4 py-3 font-medium hidden sm:table-cell">Produk</th>
              <th className="text-center px-4 py-3 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cabangList.map((cabang) => (
              <tr key={cabang.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 font-medium">
                  <div className="flex flex-col">
                    <span>{cabang.name}</span>
                    <span className="text-xs text-gray-400 sm:hidden dark:text-gray-500">{cabang.appName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell dark:text-gray-300">{cabang.appName}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell max-w-[160px] truncate dark:text-gray-300">{cabang.address || "-"}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell dark:text-gray-300">{cabang.phone || "-"}</td>
                <td className="px-4 py-3 text-center">{cabang._count.users}</td>
                <td className="px-4 py-3 text-center hidden sm:table-cell">{cabang._count.products}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEdit(cabang)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/30"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cabang)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-600 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cabangList.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400 dark:text-gray-500">
                  Belum ada cabang
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md mx-4 dark:bg-gray-800">
            <h2 className="text-lg font-bold mb-4">{editing ? "Edit Cabang" : "Tambah Cabang"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Cabang</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                  placeholder="Nama cabang"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Aplikasi</label>
                <input
                  type="text"
                  value={form.appName}
                  onChange={(e) => setForm({ ...form, appName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                  placeholder="Nama aplikasi untuk tampilan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alamat</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                  placeholder="Alamat cabang"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telepon</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                  placeholder="Nomor telepon"
                />
              </div>
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
