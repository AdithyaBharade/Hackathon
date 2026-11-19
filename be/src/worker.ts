import { logger } from "./config/logger.js";
import { startEmailWorker } from "./jobs/workers/email.worker.js";

const workers = [startEmailWorker()];
logger.info("👷 Workers started");

const shutdown = async () => {
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
