import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { ApiError } from "../utils/ApiError.js";
import { ctxOf } from "../lib/context.js";
import { batchService } from "../services/batch.service.js";
import type { ListBatchesQuery } from "../validators/batch.validator.js";

const id = (req: { params: Record<string, unknown> }) => req.params.id as string;

export const batchController = {
  create: asyncHandler(async (req, res) => sendSuccess(res, await batchService.create(ctxOf(req), req.body), 201, "Batch created")),
  list: asyncHandler(async (req, res) => sendSuccess(res, await batchService.list(ctxOf(req), req.query as unknown as ListBatchesQuery))),
  get: asyncHandler(async (req, res) => sendSuccess(res, await batchService.get(ctxOf(req), id(req)))),
  timeline: asyncHandler(async (req, res) => sendSuccess(res, await batchService.timeline(ctxOf(req), id(req)))),
  upload: asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, "Attach a CSV or XLSX file in the 'file' field");
    sendSuccess(res, await batchService.uploadCandidates(ctxOf(req), id(req), req.file), 200, "Candidates uploaded");
  }),
  submit: asyncHandler(async (req, res) => sendSuccess(res, await batchService.submit(ctxOf(req), id(req)), 200, "Sent for approval")),
  decide: asyncHandler(async (req, res) => sendSuccess(res, await batchService.decide(ctxOf(req), id(req), req.body), 200, "Decision recorded")),
  retract: asyncHandler(async (req, res) => sendSuccess(res, await batchService.retract(ctxOf(req), id(req)), 200, "Decision withdrawn")),
  stuck: asyncHandler(async (req, res) => sendSuccess(res, await batchService.stuck(ctxOf(req)))),
  summary: asyncHandler(async (req, res) => sendSuccess(res, await batchService.summary(ctxOf(req)))),
};
