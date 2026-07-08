"use client";

import { WifiOff, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/lib/use-online-status";
import { flushPending } from "@/lib/sync";
import toast from "react-hot-toast";

export default function OfflineBanner() {
  const { isOnline, pendingCount, setPendingCount } = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  const handleSync = async () => {
    const result = await flushPending();
    setPendingCount(0);
    if (result.flushed > 0) {
      toast.success(`${result.flushed} transaksi berhasil dikirim`);
    }
    if (result.failed > 0) {
      toast.error(`${result.failed} transaksi gagal dikirim (sesi mungkin expired)`);
    }
  };

  return (
    <div className={`fixed top-14 left-0 right-0 z-50 px-4 py-2 text-sm font-medium text-center flex items-center justify-center gap-2 ${
      isOnline
        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
    }`}>
      {isOnline ? (
        <>
          <CloudUpload className="w-4 h-4" />
          <span>{pendingCount} transaksi menunggu dikirim</span>
          <button onClick={handleSync} className="underline flex items-center gap-1 hover:text-blue-900 dark:hover:text-blue-100">
            Kirim Sekarang
          </button>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Kamu sedang offline. Transaksi akan disimpan dan dikirim saat online kembali.</span>
        </>
      )}
    </div>
  );
}
