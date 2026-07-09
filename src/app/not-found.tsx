import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold text-gray-300 dark:text-gray-600 mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md">
        Halaman yang Anda cari tidak ada atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}
