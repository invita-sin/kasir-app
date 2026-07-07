"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";

export default function EditProduct() {
  const params = useParams();
  const [initialData, setInitialData] = useState<{
    name: string;
    sku: string;
    price: string;
    cost: string;
    minStock: string;
    description: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setFetchError(false);
    fetch(`/api/products/${params.id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setInitialData({
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

  if (loading) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Memuat...</div>;
  if (fetchError) return (
    <div className="text-center py-8 text-red-500 dark:text-red-400">
      Gagal memuat data produk. <button onClick={() => window.location.reload()} className="underline text-blue-500">Muat ulang</button>
    </div>
  );

  return <ProductForm mode="edit" productId={params.id as string} initialData={initialData!} />;
}
