import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { isRedisReady } from "../config/redis.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { ctxOf } from "../lib/context.js";
import { sseHandler } from "../lib/realtime-hub.js";
import { notificationService } from "../services/notification.service.js";
import { queueStats } from "../jobs/queues/index.js";
import authRoutes from "./auth.routes.js";
import batchRoutes from "./batch.routes.js";
import certificateRoutes from "./certificate.routes.js";
import publicRoutes from "./public.routes.js";

const router = Router();

router.get("/health", async (_req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "connected").catch(() => "disconnected");
  const redis = isRedisReady() ? "connected" : "disconnected";
  res.status(db === "connected" ? 200 : 503).json({ status: "ok", db, redis });
});

router.use("/auth", authRoutes);
router.use("/batches", batchRoutes);
router.use("/certificates", certificateRoutes);
router.use("/public", publicRoutes);
router.get("/events", authenticate, sseHandler);
router.get("/notifications", authenticate, asyncHandler(async (req, res) => sendSuccess(res, await notificationService.list(ctxOf(req)))));
router.get("/ops/queues", authenticate, authorize("STATE"), asyncHandler(async (_req, res) => sendSuccess(res, await queueStats())));

export default router;
