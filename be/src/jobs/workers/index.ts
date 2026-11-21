import { UnrecoverableError, Worker } from "bullmq";
import { createBullConnection } from "../../config/redis.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { certificateService } from "../../services/certificate.service.js";
import { escalateStuckBatches } from "../../services/escalation.service.js";
import { WhatsAppError } from "../../lib/whatsapp.js";
import { maintenanceQueue, QUEUES, type DeliveryJob, type IssuanceJob } from "../queues/index.js";

export const startIssuanceWorker = () => {
  const w = new Worker<IssuanceJob>(QUEUES.issuance, (job) => certificateService.issueForBatch(job.data.batchId, job.data.requestId), {
    connection: createBullConnection(),
    concurrency: 2,
  });
  w.on("error", () => {});
  w.on("failed", (job, err) => logger.error({ jobId: job?.id, batchId: job?.data.batchId, err: err.message }, "issuance job failed"));
  return w;
};

export const startDeliveryWorker = () => {
  const w = new Worker<DeliveryJob>(
    QUEUES.delivery,
    async (job) => {
      try {
        return await certificateService.deliver(job.data.certificateId, job.attemptsMade + 1);
      } catch (err) {
        if (err instanceof WhatsAppError && !err.retryable) throw new UnrecoverableError(err.message);
        throw err;
      }
    },
    // The limiter protects the provider's rate limit across every worker instance
    { connection: createBullConnection(), concurrency: env.WORKER_CONCURRENCY, limiter: { max: 50, duration: 1000 } }
  );
  w.on("error", () => {});
  w.on("failed", async (job, err) => {
    if (!job) return;
    const final = job.attemptsMade >= (job.opts.attempts ?? 1) || err instanceof UnrecoverableError;
    logger.warn({ jobId: job.id, certificateId: job.data.certificateId, attempt: job.attemptsMade, final, err: err.message }, "delivery attempt failed");
    if (final) await certificateService.markDeliveryFailed(job.data.certificateId, err.message).catch(() => {});
  });
  return w;
};

export const startMaintenanceWorker = async () => {
  await maintenanceQueue.upsertJobScheduler("stuck-check", { every: env.STUCK_CHECK_EVERY_SECONDS * 1000 }, { name: "stuck-check" });
  const w = new Worker(QUEUES.maintenance, async () => ({ escalated: await escalateStuckBatches() }), {
    connection: createBullConnection(),
    concurrency: 1,
  });
  w.on("error", () => {});
  return w;
};
