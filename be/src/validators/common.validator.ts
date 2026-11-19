import { z } from "zod";

export const idParamSchema = z.object({ id: z.uuid("Invalid id") });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be 1 or more").default(1),
  limit: z.coerce.number().int().min(1).max(100, "Limit can be at most 100").default(20),
  search: z.string().trim().max(100, "Search is too long").optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
