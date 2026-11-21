import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { startOutboxRelay } from "./jobs/outbox-relay.js";
import { startDeliveryWorker, startIssuanceWorker, startMaintenanceWorker } from "./jobs/workers/index.js";

const relay = startOutboxRelay();
const workers = [startIssuanceWorker(), startDeliveryWorker(), await startMaintenanceWorker()];
logger.info("👷 Workers started: outbox relay, issuance, delivery, maintenance");

// Graceful: stop taking jobs and let active ones finish. If we are killed instead,
// BullMQ's stalled-job check hands unfinished jobs to another worker.
const shutdown = async () => {
  await relay.close();
  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
