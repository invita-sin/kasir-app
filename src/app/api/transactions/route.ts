import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { getUser } from "@/lib/get-user";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";

export const GET = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const groupBy = searchParams.get("groupBy");
  const all = searchParams.get("all") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20);

  if (groupBy === "day") {
    const result = await TransactionService.getDailySummary({
      cabangId: user.cabangId || undefined,
      page,
      limit,
    });
    return NextResponse.json(result);
  }

  const result = await TransactionService.list({ page, limit, all, cabangId: user.cabangId || undefined });

  return NextResponse.json(result);
}, "GET", "/api/transactions");

export const POST = withApiHandler(async (req) => {
  const user = await getUser(req);
  if (!user || !user.cabangId) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await parseJsonBody(req);
  const sale = await TransactionService.create(body, user.cabangId);

  logger.info({ event: "sale.created", id: sale.id, total: sale.total, items: sale.items.length });

  return NextResponse.json(sale, { status: 201 });
}, "POST", "/api/transactions");
