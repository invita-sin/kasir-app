"use client";

export default function CashierError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Gagal Memuat Kasir</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
        {error.message || "Periksa koneksi dan coba lagi"}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        Coba Lagi
      </button>
    </div>
  );
}
