const inMemoryAttempts = new Map<string, { count: number; resetAt: number }>();

let upstashRatelimit: { limit: (key: string) => Promise<{ success: boolean; remaining: number }> } | null = null;

async function getUpstashRatelimit() {
  if (upstashRatelimit) return upstashRatelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  try {
    const { Ratelimit } = await import("@upstash/ratelimit");
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    upstashRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      prefix: "kasir-ratelimit",
    });
    return upstashRatelimit;
  } catch {
    return null;
  }
}

export async function checkRateLimit(key: string, maxAttempts = 5, windowMs = 60000): Promise<boolean> {
  const upstash = await getUpstashRatelimit();
  if (upstash) {
    const result = await upstash.limit(key);
    return result.success;
  }

  const now = Date.now();
  const entry = inMemoryAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    inMemoryAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count++;
  if (entry.count > maxAttempts) {
    return false;
  }
  return true;
}

export function resetRateLimit(key: string): void {
  inMemoryAttempts.delete(key);
}
