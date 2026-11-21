import type { Request } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../utils/cookies.js";
import { authService } from "../services/auth.service.js";
import { tokenService } from "../services/token.service.js";

const meta = (req: Request) => ({ userAgent: req.get("user-agent"), ip: req.ip });

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { user, tokens } = await authService.login(req.body, meta(req));
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    sendSuccess(res, { user });
  }),

  refresh: asyncHandler(async (req, res) => {
    try {
      const tokens = await tokenService.rotate(req.cookies?.[REFRESH_COOKIE], meta(req));
      setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
      sendSuccess(res, null, 200, "Token refreshed");
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  }),

  logout: asyncHandler(async (req, res) => {
    await tokenService.revoke(req.cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(res);
    sendSuccess(res, null, 200, "Logged out");
  }),

  logoutAll: asyncHandler(async (req, res) => {
    await tokenService.revokeAll(req.user!.sub);
    clearAuthCookies(res);
    sendSuccess(res, null, 200, "Logged out of all sessions");
  }),

  me: asyncHandler(async (req, res) => sendSuccess(res, await authService.me(req.user!.sub))),
};
