import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrThrow } from "@/lib/middleware-helpers";
import { getMetrics, getMetricsContentType } from "@/lib/metrics";

export async function GET(req: NextRequest) {
  await requireAdminOrThrow(req);

  const contentType = await getMetricsContentType();
  const metrics = await getMetrics();

  return new NextResponse(metrics, {
    status: 200,
    headers: { "Content-Type": contentType },
  });
}
