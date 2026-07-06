import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "1.0.1",
    apkUrl: "https://github.com/invita-sin/kasir-app/releases/latest/download/kasir-app.apk",
    releaseNotes: "- Fitur void transaksi\n- Grafik pendapatan harian\n- Perbaikan bug dan optimasi",
    minVersion: "1.0.0",
  });
}
