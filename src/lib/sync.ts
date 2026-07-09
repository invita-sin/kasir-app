import { getPendingTransactions, removePendingTransaction } from "./db";
import { apiPost } from "./api-client";

export async function flushPending(): Promise<{ flushed: number; failed: number }> {
  const pending = await getPendingTransactions();
  let flushed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await apiPost("/api/transactions", item.data);
      await removePendingTransaction(item.id!);
      flushed++;
    } catch (err) {
      if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401) {
        console.warn("[Sync] removing pending transaction with expired session:", item.id);
        await removePendingTransaction(item.id!);
        failed++;
      } else {
        console.warn("[Sync] failed to flush pending transaction:", err);
        failed++;
      }
    }
  }

  return { flushed, failed };
}
