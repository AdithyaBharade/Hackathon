import { z } from "zod";

export const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(6),
});

export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
