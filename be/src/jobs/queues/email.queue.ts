import { Queue } from "bullmq";
import { createBullConnection, isRedisReady } from "../../config/redis.js";
import { logger } from "../../config/logger.js";

export const EMAIL_QUEUE = "email";

export interface EmailJob {
  to: string;
  subject: string;
  body: string;
}

export const emailQueue = new Queue<EmailJob>(EMAIL_QUEUE, {
  connection: createBullConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

// Connection errors are already logged once by config/redis.ts
emailQueue.on("error", () => {});

/** Enqueue without blocking the request if Redis is down. */
export async function enqueueEmail(data: EmailJob) {
  if (!isRedisReady()) {
    logger.warn({ to: data.to }, "Redis down - email job skipped");
    return;
  }
  await emailQueue.add("send", data);
}
