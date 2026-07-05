import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/middleware-helpers";
import { getMetrics, getMetricsContentType } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const contentType = await getMetricsContentType();
  const metrics = await getMetrics();

  return new NextResponse(metrics, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
