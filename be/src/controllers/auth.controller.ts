import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { authService } from "../services/auth.service.js";

export const authController = {
  register: asyncHandler(async (req, res) => sendSuccess(res, await authService.register(req.body), 201)),
  login: asyncHandler(async (req, res) => sendSuccess(res, await authService.login(req.body))),
  me: asyncHandler(async (req, res) => sendSuccess(res, await authService.me(req.user!.sub))),
};
