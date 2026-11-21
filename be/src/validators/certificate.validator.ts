import { z } from "zod";
import { paginationSchema } from "./common.validator.js";

export const listCertificatesSchema = paginationSchema.extend({
  batchId: z.uuid().optional(),
  status: z.enum(["ISSUED", "REVOKED"]).optional(),
});

export const revokeSchema = z.object({
  reason: z.string({ error: "Reason is required" }).trim().min(5, "Give a reason (at least 5 characters)").max(1000),
});

export const certificateNumberParam = z.object({
  number: z.string().trim().toUpperCase().regex(/^PSM-\d{4}-\d{6,}$/, "Certificate numbers look like PSM-2026-000123"),
});

export const pdfQuerySchema = z.object({ sig: z.string().min(10).max(100) });

export type ListCertificatesQuery = z.infer<typeof listCertificatesSchema>;
