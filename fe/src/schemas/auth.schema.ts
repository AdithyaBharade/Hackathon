import { z } from "zod";
import { email } from "./fields";

export const loginSchema = z.object({
  email: email(),
  password: z.string().min(1, "Password is required"),
});

// Forms work with the raw input; the API receives the cleaned output
export type LoginFormValues = z.input<typeof loginSchema>;
export type LoginInput = z.output<typeof loginSchema>;
