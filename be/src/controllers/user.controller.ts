import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { userService } from "../services/user.service.js";
import type { PaginationQuery } from "../validators/common.validator.js";

export const userController = {
  getAll: asyncHandler(async (req, res) =>
    sendSuccess(res, await userService.findAll(req.query as unknown as PaginationQuery))
  ),
  getById: asyncHandler(async (req, res) => sendSuccess(res, await userService.findById(req.params.id as string))),
  update: asyncHandler(async (req, res) =>
    sendSuccess(res, await userService.update(req.params.id as string, req.body), 200, "User updated")
  ),
  remove: asyncHandler(async (req, res) => {
    await userService.remove(req.params.id as string);
    res.status(204).send();
  }),
};
