import { Queue } from "bullmq";
import { createBullConnection } from "../../config/redis.js";
import { env } from "../../config/env.js";

/**
 * Queues (BullMQ on Redis):
 *  - issuance:    one job per approved batch -> creates certificates, fans out delivery jobs
 *  - delivery:    one job per certificate    -> renders PDF, sends WhatsApp, retried with backoff
 *  - maintenance: repeatable jobs            -> stuck-batch escalation
 * Job ids are deterministic, so enqueuing the same work twice is a no-op while it is pending.
 */
export const QUEUES = { issuance: "issuance", delivery: "delivery", maintenance: "maintenance" } as const;

export interface IssuanceJob {
  batchId: string;
  requestId?: string;
}
export interface DeliveryJob {
  certificateId: string;
  requestId?: string;
}

const connection = createBullConnection();

export const issuanceQueue = new Queue<IssuanceJob>(QUEUES.issuance, {
  connection,
  defaultJobOptions: { attempts: 10, backoff: { type: "exponential", delay: 1000 }, removeOnComplete: 1000, removeOnFail: 5000 },
});

export const deliveryQueue = new Queue<DeliveryJob>(QUEUES.delivery, {
  connection,
  defaultJobOptions: {
    attempts: env.WHATSAPP_MAX_ATTEMPTS,
    backoff: { type: "capped-exponential" },
    removeOnComplete: 5000,
    removeOnFail: 10000,
  },
});

export const maintenanceQueue = new Queue(QUEUES.maintenance, { connection, defaultJobOptions: { removeOnComplete: 50, removeOnFail: 50 } });

// Connection errors are already logged once by config/redis.ts
for (const q of [issuanceQueue, deliveryQueue, maintenanceQueue]) q.on("error", () => {});

export const enqueueIssuance = (data: IssuanceJob) => issuanceQueue.add("issue-batch", data, { jobId: `issue-${data.batchId}` });

export const enqueueDelivery = (data: DeliveryJob, opts: { retry?: boolean } = {}) =>
  deliveryQueue.add("deliver-certificate", data, {
    // A manual resend needs a fresh id; otherwise de-duplicate on the certificate
    jobId: opts.retry ? `deliver-${data.certificateId}-${Date.now()}` : `deliver-${data.certificateId}`,
  });

export const queueStats = async () => {
  const [issuance, delivery] = await Promise.all([
    issuanceQueue.getJobCounts("waiting", "active", "delayed", "failed"),
    deliveryQueue.getJobCounts("waiting", "active", "delayed", "failed"),
  ]);
  return { issuance, delivery };
};

/** Exponential backoff with full jitter, capped. Jitter spreads retries out so a
 *  recovering provider isn't hit by every queued message at the same instant. */
export const cappedBackoff = (attemptsMade: number) => {
  const exp = Math.min(env.WHATSAPP_RETRY_MAX_MS, env.WHATSAPP_RETRY_BASE_MS * 2 ** Math.max(0, attemptsMade - 1));
  return Math.round(exp / 2 + Math.random() * (exp / 2));
};
