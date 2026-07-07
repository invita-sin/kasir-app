import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async () => {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const dbLatency = Date.now() - start;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    db: { status: "connected", latencyMs: dbLatency },
  });
}, "GET", "/api/health");
