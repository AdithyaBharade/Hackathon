import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { ctxOf } from "../lib/context.js";
import { certificateService } from "../services/certificate.service.js";
import type { ListCertificatesQuery } from "../validators/certificate.validator.js";

export const certificateController = {
  list: asyncHandler(async (req, res) => sendSuccess(res, await certificateService.list(ctxOf(req), req.query as unknown as ListCertificatesQuery))),
  timeline: asyncHandler(async (req, res) => sendSuccess(res, await certificateService.timeline(ctxOf(req), req.params.id as string))),
  revoke: asyncHandler(async (req, res) =>
    sendSuccess(res, await certificateService.revoke(ctxOf(req), req.params.id as string, req.body.reason), 200, "Certificate revoked")
  ),
  resend: asyncHandler(async (req, res) => sendSuccess(res, await certificateService.resend(ctxOf(req), req.params.id as string), 200, "Delivery re-queued")),

  verify: asyncHandler(async (req, res) => {
    res.setHeader("cache-control", "no-store");
    sendSuccess(res, await certificateService.verify(req.params.number as string));
  }),
  pdf: asyncHandler(async (req, res) => {
    const { stream, filename } = await certificateService.openPdf(req.params.number as string, req.query.sig as string);
    res.setHeader("content-type", "application/pdf");
    res.setHeader("content-disposition", `inline; filename="${filename}"`);
    res.setHeader("cache-control", "private, no-store");
    stream.pipe(res);
  }),
};
