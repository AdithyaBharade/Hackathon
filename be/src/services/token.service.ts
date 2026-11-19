import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { signAccessToken } from "../utils/jwt.js";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export interface ClientMeta {
  userAgent?: string;
  ip?: string;
}

export const tokenService = {
  /** Issue a new access + refresh token pair and persist the refresh token hash. */
  async issue(user: { id: string; role: "USER" | "ADMIN" }, meta: ClientMeta = {}) {
    const refreshToken = randomBytes(48).toString("base64url");
    await prisma.refreshToken.create({
      data: {
        tokenHash: hash(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return { accessToken: signAccessToken({ sub: user.id, role: user.role }), refreshToken };
  },

  /** Rotate: revoke the presented refresh token and issue a new pair. Detects reuse. */
  async rotate(refreshToken: string | undefined, meta: ClientMeta = {}) {
    if (!refreshToken) throw new ApiError(401, "Missing refresh token");

    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash: hash(refreshToken) },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!record) throw new ApiError(401, "Invalid refresh token");

    if (record.revokedAt) {
      // A revoked token was reused -> likely stolen. Kill every session for this user.
      logger.warn({ userId: record.userId }, "Refresh token reuse detected - revoking all sessions");
      await this.revokeAll(record.userId);
      throw new ApiError(401, "Refresh token reused");
    }
    if (record.expiresAt < new Date()) throw new ApiError(401, "Refresh token expired");

    // Conditional update so two concurrent refreshes can't both succeed
    const { count } = await prisma.refreshToken.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new ApiError(401, "Refresh token already used");

    return this.issue(record.user, meta);
  },

  async revoke(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hash(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  revokeAll: (userId: string) =>
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
};
