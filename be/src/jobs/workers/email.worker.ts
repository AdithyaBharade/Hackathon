import { Worker } from "bullmq";
import { createBullConnection } from "../../config/redis.js";
import { logger } from "../../config/logger.js";
import { EMAIL_QUEUE, type EmailJob } from "../queues/email.queue.js";

export const startEmailWorker = () => {
  const worker = new Worker<EmailJob>(
    EMAIL_QUEUE,
    async (job) => {
      // TODO: plug in a real provider (SES, Resend, Nodemailer...)
      logger.info({ jobId: job.id, to: job.data.to, subject: job.data.subject }, "📧 sending email");
    },
    { connection: createBullConnection(), concurrency: 5 }
  );

  worker.on("error", () => {}); // connection errors logged in config/redis.ts
  worker.on("completed", (job) => logger.debug({ jobId: job.id }, "email job completed"));
  worker.on("failed", (job, err) => logger.error({ jobId: job?.id, err }, "email job failed"));
  return worker;
};
