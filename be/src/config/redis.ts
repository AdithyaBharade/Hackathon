import { Redis } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

const warned: Record<string, boolean> = {};
const retryStrategy = (times: number) => Math.min(times * 500, 10_000);

const attachLogs = (client: Redis, name: string) => {
  client.on("ready", () => {
    warned[name] = false;
    logger.info(`Redis (${name}) connected`);
  });
  client.on("error", (err) => {
    if (!warned[name]) logger.warn({ err: err.message }, `Redis (${name}) unavailable - caching/queues disabled until it is up`);
    warned[name] = true;
  });
};

/** Cache client: fails fast when Redis is down so requests never hang. */
export const redis = new Redis(env.REDIS_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy,
});
attachLogs(redis, "cache");

/** Connection for BullMQ (requires maxRetriesPerRequest: null). */
export const createBullConnection = () => {
  const c = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, retryStrategy });
  attachLogs(c, "bullmq");
  return c;
};

export const isRedisReady = () => redis.status === "ready";
