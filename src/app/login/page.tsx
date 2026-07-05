"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";
import toast from "react-hot-toast";

interface FormErrors {
  username?: string;
  password?: string;
}

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.username) errs.username = "Username wajib diisi";
    if (!form.password) errs.password = "Password wajib diisi";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Login berhasil");
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "Login gagal");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Kasir App</h1>
          <p className="text-sm text-gray-400 mt-1">Masuk untuk melanjutkan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => { setForm({ ...form, username: e.target.value }); setErrors({ ...errors, username: undefined }); }}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.username ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
              autoFocus
            />
            {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: undefined }); }}
              className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? "border-red-300 bg-red-50" : "border-gray-200"
              }`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              "Memproses..."
            ) : (
              <>
                Masuk
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
