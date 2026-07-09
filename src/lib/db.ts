interface PendingTransaction {
  id?: number;
  data: { items: { productId: string; quantity: number }[]; paymentMethod?: string };
  createdAt: string;
  retries: number;
}

interface ApiCacheEntry {
  url: string;
  data: unknown;
  cachedAt: number;
}

const DB_NAME = "KasirOfflineDB";
const DB_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("pending-transactions")) {
        const store = db.createObjectStore("pending-transactions", { keyPath: "id", autoIncrement: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("product-catalog")) {
        db.createObjectStore("product-catalog", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("api-cache")) {
        const store = db.createObjectStore("api-cache", { keyPath: "url" });
        store.createIndex("cachedAt", "cachedAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Pending Transactions ---

export async function queueTransaction(data: { items: { productId: string; quantity: number }[]; paymentMethod?: string }): Promise<void> {
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

// --- Product Catalog ---

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
}

export async function saveProducts(products: CachedProduct[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("product-catalog", "readwrite");
  const store = tx.objectStore("product-catalog");
  for (const p of products) {
    store.put({ ...p, _cachedAt: Date.now() });
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedProducts(): Promise<CachedProduct[]> {
  const db = await openDB();
  const tx = db.transaction("product-catalog", "readonly");
  const store = tx.objectStore("product-catalog");
  const all = store.getAll();
  return new Promise((resolve, reject) => {
    all.onsuccess = () => resolve(all.result.map((p: Record<string, unknown>) => {
      const { _cachedAt, ...product } = p;
      return product as unknown as CachedProduct;
    }));
    all.onerror = () => reject(all.error);
  });
}

// --- Generic API Cache ---

export async function setApiCache(url: string, data: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction("api-cache", "readwrite");
  const store = tx.objectStore("api-cache");
  const count = await new Promise<number>((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (count >= 50) {
    const index = store.index("cachedAt");
    const cursor = await new Promise<IDBCursorWithValue | null>((resolve, reject) => {
      const req = index.openCursor(null, "next");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (cursor) {
      store.delete(cursor.primaryKey);
    }
  }
  store.put({ url, data, cachedAt: Date.now() } satisfies ApiCacheEntry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getApiCache<T>(url: string): Promise<T | null> {
  const db = await openDB();
  const tx = db.transaction("api-cache", "readonly");
  const store = tx.objectStore("api-cache");
  const result = await new Promise<ApiCacheEntry | undefined>((resolve, reject) => {
    const req = store.get(url);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return result?.data as T ?? null;
}
