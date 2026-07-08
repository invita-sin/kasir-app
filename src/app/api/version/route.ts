import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "1.1.0",
    apkUrl: "https://github.com/invita-sin/kasir-app/releases/latest/download/kasir-app.apk",
    releaseNotes:
      "- Offline: transaksi tetap jalan tanpa internet\n" +
      "- Multi cabang & multi level user\n" +
      "- Mode gelap (dark mode)\n" +
      "- Void transaksi dengan restore stok\n" +
      "- Grafik pendapatan harian\n" +
      "- Hitung laba (modal)\n" +
      "- Manajemen stok masuk/keluar\n" +
      "- Dashboard + menu favorit\n" +
      "- Perbaikan performa & keamanan",
    minVersion: "1.0.0",
  });
}
