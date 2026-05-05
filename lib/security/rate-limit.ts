import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const curr = memoryBuckets.get(key);
  if (!curr || curr.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  if (curr.count >= limit) return { success: false, remaining: 0 };
  curr.count += 1;
  return { success: true, remaining: Math.max(0, limit - curr.count) };
}

function getUpstashLimiter(limit: number, windowLabel: `${number} s` | `${number} m`) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: windowLabel.endsWith(" m")
      ? Ratelimit.fixedWindow(limit, windowLabel)
      : Ratelimit.fixedWindow(limit, windowLabel),
    analytics: false,
    prefix: "rl",
  });
}

export async function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowMs: number;
  windowLabel?: `${number} s` | `${number} m`;
}) {
  const upstash = opts.windowLabel ? getUpstashLimiter(opts.limit, opts.windowLabel) : null;
  if (upstash) {
    const r = await upstash.limit(opts.key);
    return { success: r.success, remaining: r.remaining };
  }
  return memoryLimit(opts.key, opts.limit, opts.windowMs);
}
