"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-50 dark:bg-gray-950 min-h-screen flex items-center justify-center">
        <div className="text-center px-4 max-w-md">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Terjadi Kesalahan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {error.message || "Terjadi kesalahan yang tidak terduga"}
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Coba Lagi
          </button>
        </div>
      </body>
    </html>
  );
}
