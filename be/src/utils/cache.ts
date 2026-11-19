import { isRedisReady, redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

/** Read-through cache. Falls back to the loader if Redis is down. */
export async function cached<T>(key: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  if (isRedisReady()) {
    try {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit) as T;
    } catch (err) {
      logger.warn({ err, key }, "cache get failed");
    }
  }
  const value = await loader();
  if (isRedisReady()) redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => {});
  return value;
}

export async function invalidate(...keys: string[]) {
  if (isRedisReady()) await redis.del(...keys).catch(() => {});
}
