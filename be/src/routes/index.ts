import { Router } from "express";
import { prisma } from "../config/prisma.js";
import { isRedisReady } from "../config/redis.js";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";

const router = Router();

router.get("/health", async (_req, res) => {
  const db = await prisma.$queryRaw`SELECT 1`.then(() => "connected").catch(() => "disconnected");
  const redis = isRedisReady() ? "connected" : "disconnected";
  res.status(db === "connected" ? 200 : 503).json({ status: "ok", db, redis });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;
