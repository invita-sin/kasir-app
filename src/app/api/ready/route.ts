import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async () => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  const dbStart = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  checks.database = { status: "ok", latencyMs: Date.now() - dbStart };

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  return NextResponse.json(
    { status: allOk ? "ok" : "degraded", timestamp: new Date().toISOString(), checks },
    { status: allOk ? 200 : 503 }
  );
}, "GET", "/api/ready");
