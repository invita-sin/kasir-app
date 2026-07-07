import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/lib/services/dashboard.service";
import { getUser } from "@/lib/get-user";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
  }

  const cabangId = user.role === "SUPER_ADMIN" ? undefined : user.cabangId!;
  const summary = await DashboardService.getSummary(cabangId);

  return NextResponse.json(summary);
}, "GET", "/api/dashboard");
