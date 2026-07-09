interface CacheEntry {
  value: unknown;
  expiry: number;
}

const store = new Map<string, CacheEntry>();

function isValid(entry: CacheEntry): boolean {
  return Date.now() < entry.expiry;
}

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (!isValid(entry)) {
      store.delete(key);
      return null;
    }
    return entry.value as T;
  },

  set(key: string, value: unknown, ttlMs: number): void {
    store.set(key, { value, expiry: Date.now() + ttlMs });
  },

  clear(): void {
    store.clear();
  },

  delete(key: string): void {
    store.delete(key);
  },

  clearPrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) store.delete(key);
    }
  },
};
