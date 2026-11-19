import { z } from "zod";
import { email, password, personName } from "./fields.js";

// Login doesn't enforce password strength (rules may change after users signed up)
export const loginSchema = z.object({
  email: email(),
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(72),
});

export const registerSchema = z.object({
  name: personName(),
  email: email(),
  password: password(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
