import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { withApiHandler } from "@/lib/api-handler";
import { requireAuthOrThrow } from "@/lib/middleware-helpers";
import { ForbiddenError } from "@/lib/errors";

export const GET = withApiHandler(async (req) => {
  const user = await requireAuthOrThrow(req);
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const { searchParams } = new URL(req.url);
  const startDate = searchParams.get("startDate") || undefined;
  const endDate = searchParams.get("endDate") || undefined;

  const cabangId = user.role === "SUPER_ADMIN" ? undefined : user.cabangId!;
  const summary = await DashboardService.getSummary(cabangId, startDate, endDate);

  return NextResponse.json(summary);
}, "GET", "/api/dashboard");
