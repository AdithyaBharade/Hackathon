import { z } from "zod";
import { requiredText } from "./fields";

export const createBatchSchema = z.object({
  courseName: requiredText("Course name", 120),
  trainingEndDate: z
    .string()
    .min(1, "Training end date is required")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date")
    .refine((v) => new Date(v) <= new Date(), "Training end date cannot be in the future"),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(5, "Give a reason (at least 5 characters)").max(1000, "Reason is too long"),
});

export type CreateBatchFormValues = z.input<typeof createBatchSchema>;
export type CreateBatchInput = z.output<typeof createBatchSchema>;
export type ReasonInput = z.output<typeof reasonSchema>;
