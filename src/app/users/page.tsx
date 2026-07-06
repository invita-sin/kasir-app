"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { usersApi, getErrorMessage, apiGet } from "@/lib/api-client";
import type { UserData, CreateUserInput } from "@/lib/api-client";

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 dark:border-gray-700">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 bg-gray-100 rounded animate-pulse dark:bg-gray-700" style={{ width: `${40 + i * 15}px` }} />
        </td>
      ))}
    </tr>
  );
}

interface FormErrors {
  username?: string;
  password?: string;
  name?: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [cabangList, setCabangList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserData | null>(null);
  const [form, setForm] = useState<CreateUserInput>({ username: "", password: "", name: "", role: "KASIR" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const fetchUsers = useCallback(async () => {
    try {
      const data = await usersApi.list();
      setUsers(data);
    } catch (e) {
      toast.error(getErrorMessage(e, "Gagal memuat data pengguna"));
    }
    setLoading(false);
  }, []);

  const fetchCabang = useCallback(async () => {
    try {
      const data = await apiGet<{ id: string; name: string }[]>("/api/cabang");
      setCabangList(data);
    } catch {
      // Cabang fetch gagal — dropdown cabang tidak tersedia
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCabang();
  }, [fetchUsers, fetchCabang]);

  const openCreate = () => {
    setEditing(null);
    setForm({ username: "", password: "", name: "", role: "KASIR", cabangId: cabangList[0]?.id || "" });
    setErrors({});
    setShowForm(true);
  };

  const openEdit = (user: UserData) => {
    setEditing(user);
    setForm({ username: user.username, password: "", name: user.name, role: user.role, cabangId: user.cabangId || "" });
    setErrors({});
    setShowForm(true);
  };

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.username || form.username.length < 3) errs.username = "Username minimal 3 karakter";
    if (!editing && (!form.password || form.password.length < 6)) errs.password = "Password minimal 6 karakter";
    if (!form.name) errs.name = "Nama wajib diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    try {
      if (editing) {
        const body: Partial<CreateUserInput> = {};
        if (form.username !== editing.username) body.username = form.username;
        if (form.name !== editing.name) body.name = form.name;
        if (form.role !== editing.role) body.role = form.role;
        if (form.password) body.password = form.password;

        if (Object.keys(body).length === 0) {
          toast.error("Tidak ada perubahan");
          setSaving(false);
          return;
        }

        await usersApi.update(editing.id, body);
        toast.success("User berhasil diupdate");
        setShowForm(false);
        fetchUsers();
      } else {
        await usersApi.create(form);
        toast.success("User berhasil dibuat");
        setShowForm(false);
        fetchUsers();
      }
    } catch (e) {
      toast.error(getErrorMessage(e, "Gagal menyimpan user"));
    }
    setSaving(false);
  };

  const handleDelete = async (user: UserData) => {
    if (user.role === "SUPER_ADMIN") {
      toast.error("Tidak dapat menghapus Super Admin");
      return;
    }
    if (!confirm(`Hapus user "${user.name}" (${user.username})?`)) return;

    try {
      await usersApi.delete(user.id);
      toast.success("User berhasil dihapus");
      fetchUsers();
    } catch (e) {
      toast.error(getErrorMessage(e, "Gagal menghapus user"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Kelola Pengguna</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 dark:bg-black/60" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-xl dark:bg-gray-800" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">
              {editing ? "Edit User" : "Tambah User"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => { setForm({ ...form, username: e.target.value }); setErrors({ ...errors, username: undefined }); }}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.username ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500" : "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  }`}
                />
                {errors.username && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.username}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {editing ? "Password (kosongkan jika tidak diganti)" : "Password *"}
                </label>
                <input
                  type="password"
                  required={!editing}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: undefined }); }}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.password ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500" : "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  }`}
                />
                {errors.password && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.password}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
                    errors.name ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500" : "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  }`}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                >
                  <option value="KASIR">Kasir</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>
              {form.role !== "SUPER_ADMIN" && cabangList.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cabang</label>
                  <select
                    value={form.cabangId || ""}
                    onChange={(e) => setForm({ ...form, cabangId: e.target.value || null })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
                  >
                    <option value="">Pilih cabang</option>
                    {cabangList.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 font-medium">Username</th>
                <th className="py-3 px-4 font-medium">Nama</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Cabang</th>
                <th className="py-3 px-4 font-medium">Dibuat</th>
                <th className="py-3 px-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">Tidak ada pengguna</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
            <thead>
              <tr className="border-b border-gray-100 text-left text-sm text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4 font-medium">Username</th>
                <th className="py-3 px-4 font-medium">Nama</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Cabang</th>
                <th className="py-3 px-4 font-medium">Dibuat</th>
                <th className="py-3 px-4 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 dark:border-gray-700 dark:hover:bg-gray-700/50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-gray-100">{user.username}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-300">{user.name}</td>
                  <td className="py-3 px-4">
                    <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded ${
                      user.role === "SUPER_ADMIN" ? "bg-red-100 text-red-700" : user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                    }`}>
                      {user.role === "SUPER_ADMIN" ? "SUPER ADMIN" : user.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {user.cabangId ? cabangList.find((c) => c.id === user.cabangId)?.name || "-" : "-"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 dark:hover:bg-gray-700"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.role !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 dark:hover:bg-red-900/30"
                          title="Hapus user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
