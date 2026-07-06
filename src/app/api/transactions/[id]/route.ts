import { NextRequest, NextResponse } from "next/server";
import { TransactionService } from "@/lib/services/transaction.service";
import { getUser } from "@/lib/get-user";
import { handleApiError } from "@/lib/errors";
import { logger, generateRequestId } from "@/lib/logger";
import { parseJsonBody } from "@/lib/request";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  try {
    const user = await getUser(req);
    if (!user || !user.cabangId) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await parseJsonBody(req);
    const reason = body && typeof body === "object" && "reason" in body ? String((body as { reason: unknown }).reason) : undefined;
    const result = await TransactionService.voidSale(id, user.cabangId, reason);

    logger.info({ event: "sale.voided", requestId, id });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
