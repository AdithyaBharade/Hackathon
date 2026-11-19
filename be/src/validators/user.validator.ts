import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  email: z.email().toLowerCase().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
