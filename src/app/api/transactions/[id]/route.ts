import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { logger } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";
import { withApiHandler } from "@/lib/api-handler";
import { requireAuthOrThrow } from "@/lib/middleware-helpers";
import { ForbiddenError } from "@/lib/errors";

export const POST = withApiHandler(async (req, ctx) => {
  const user = await requireAuthOrThrow(req);
  if (!user.cabangId) throw new ForbiddenError("User tidak memiliki cabang");
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") throw new ForbiddenError("Akses hanya untuk Admin");

  const { id } = await ctx.params;
  const body = await parseJsonBody(req);
  const reason = body && typeof body === "object" && "reason" in body ? String((body as { reason: unknown }).reason) : undefined;
  const result = await TransactionService.voidSale(id, user.cabangId, reason, user.userId);

  logger.info({ event: "sale.voided", id });

  return NextResponse.json(result);
}, "POST", "/api/transactions/[id]");
