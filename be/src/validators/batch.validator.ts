import { z } from "zod";
import { requiredText } from "./fields.js";
import { paginationSchema } from "./common.validator.js";

export const createBatchSchema = z.object({
  courseName: requiredText("Course name", 120),
  trainingEndDate: z.coerce
    .date({ error: "Enter a valid training end date" })
    .refine((d) => d <= new Date(), "Training end date cannot be in the future"),
});

export const listBatchesSchema = paginationSchema.extend({
  status: z.enum(["DRAFT", "PENDING_DISTRICT", "PENDING_QUALITY", "PENDING_STATE", "SENT_BACK", "REJECTED", "APPROVED"]).optional(),
  inbox: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const decisionSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT", "SEND_BACK"], { error: "Action must be APPROVE, REJECT or SEND_BACK" }),
    reason: z.string().trim().max(1000, "Reason is too long").optional(),
    /** The batch version the officer reviewed. Stops a stale screen approving changed data. */
    version: z.coerce.number().int().min(1),
  })
  .refine((v) => v.action === "APPROVE" || (v.reason && v.reason.length >= 5), {
    message: "Give a reason (at least 5 characters) when rejecting or sending back",
    path: ["reason"],
  });

export type CreateBatchInput = z.infer<typeof createBatchSchema>;
export type ListBatchesQuery = z.infer<typeof listBatchesSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
