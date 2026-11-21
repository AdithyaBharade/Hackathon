import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { startRealtimeHub, stopRealtimeHub } from "./lib/realtime-hub.js";

startRealtimeHub();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API running on http://localhost:${env.PORT}/api`);
});

const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down`);
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), redis.quit(), stopRealtimeHub()]);
    process.exit(0);
  });
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandledRejection"));
