"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

interface FormErrors {
  name?: string;
  sku?: string;
  price?: string;
  cost?: string;
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({
    name: "",
    sku: "",
    price: "",
    cost: "",
    minStock: "0",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const controller = new AbortController();
    setFetchError(false);
    fetch(`/api/products/${params.id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setForm({
          name: data.name,
          sku: data.sku,
          price: String(data.price),
          cost: String(data.cost ?? 0),
          minStock: String(data.minStock),
          description: data.description || "",
        });
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setFetchError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [params.id]);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!form.name.trim()) errs.name = "Nama produk wajib diisi";
    if (!form.sku.trim()) errs.sku = "SKU wajib diisi";
    if (!form.price || Number(form.price) <= 0) errs.price = "Harga harus lebih dari 0";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const res = await fetch(`/api/products/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      toast.success("Produk berhasil diupdate");
      router.push("/products");
    } else {
      const data = await res.json();
      toast.error(data.error || "Gagal mengupdate produk");
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;
  if (fetchError) return (
    <div className="text-center py-8 text-red-500 dark:text-red-400">
      Gagal memuat data produk. <button onClick={() => window.location.reload()} className="underline text-blue-500">Muat ulang</button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/products" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Produk</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700" noValidate>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nama Produk *</label>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU *</label>
          <input
            type="text"
            required
            value={form.sku}
            onChange={(e) => { setForm({ ...form, sku: e.target.value }); setErrors({ ...errors, sku: undefined }); }}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
              errors.sku ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500" : "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            }`}
          />
          {errors.sku && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.sku}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga *</label>
          <input
            type="number"
            required
            min={0}
            value={form.price}
            onChange={(e) => { setForm({ ...form, price: e.target.value }); setErrors({ ...errors, price: undefined }); }}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
              errors.price ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500" : "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            }`}
          />
          {errors.price && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.price}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Harga Beli (Modal)</label>
          <input
            type="number"
            min={0}
            value={form.cost}
            onChange={(e) => { setForm({ ...form, cost: e.target.value }); setErrors({ ...errors, cost: undefined }); }}
            className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${
              errors.cost ? "border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-500" : "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            }`}
          />
          {errors.cost && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.cost}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimal Stok</label>
          <input
            type="number"
            min={0}
            value={form.minStock}
            onChange={(e) => setForm({ ...form, minStock: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deskripsi</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-400"
            rows={3}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </form>
    </div>
  );
}
