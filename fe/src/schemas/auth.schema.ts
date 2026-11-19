import { z } from "zod";
import { email, password, personName } from "./fields";

export const loginSchema = z.object({
  email: email(),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: personName(),
  email: email(),
  password: password(),
});

// Forms work with the raw input; the API receives the cleaned output
export type LoginFormValues = z.input<typeof loginSchema>;
export type LoginInput = z.output<typeof loginSchema>;
export type RegisterFormValues = z.input<typeof registerSchema>;
export type RegisterInput = z.output<typeof registerSchema>;
