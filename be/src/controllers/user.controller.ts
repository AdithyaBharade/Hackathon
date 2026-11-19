import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { userService } from "../services/user.service.js";

export const userController = {
  getAll: asyncHandler(async (_req, res) => sendSuccess(res, await userService.findAll())),
  getById: asyncHandler(async (req, res) => sendSuccess(res, await userService.findById(req.params.id as string))),
  update: asyncHandler(async (req, res) =>
    sendSuccess(res, await userService.update(req.params.id as string, req.body))
  ),
  remove: asyncHandler(async (req, res) => {
    await userService.remove(req.params.id as string);
    res.status(204).send();
  }),
};
