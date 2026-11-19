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
  if (isRedisReady() && keys.length) await redis.del(...keys).catch(() => {});
}

/** Delete every key starting with prefix (uses SCAN, safe for production). */
export async function invalidatePrefix(prefix: string) {
  if (!isRedisReady()) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    logger.warn({ err, prefix }, "cache invalidatePrefix failed");
  }
}
