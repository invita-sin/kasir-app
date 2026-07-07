interface PendingTransaction {
  id?: number;
  data: { items: { productId: string; quantity: number }[] };
  createdAt: string;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("KasirOfflineDB", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("pending-transactions")) {
        const store = db.createObjectStore("pending-transactions", { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueTransaction(data: { items: { productId: string; quantity: number }[] }): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("pending-transactions", "readwrite");
  const store = tx.objectStore("pending-transactions");
  store.add({ data, createdAt: new Date().toISOString(), retries: 0 });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const db = await openDB();
  const tx = db.transaction("pending-transactions", "readonly");
  const store = tx.objectStore("pending-transactions");
  const all = store.getAll();
  return new Promise((resolve, reject) => {
    all.onsuccess = () => resolve(all.result);
    all.onerror = () => reject(all.error);
  });
}

export async function removePendingTransaction(id: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("pending-transactions", "readwrite");
  const store = tx.objectStore("pending-transactions");
  store.delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushPendingTransactions(): Promise<{ flushed: number; failed: number }> {
  const pending = await getPendingTransactions();
  let flushed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.data),
      });
      if (res.ok) {
        await removePendingTransaction(item.id!);
        flushed++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { flushed, failed };
}
