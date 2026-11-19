import { z } from "zod";
import { email, personName } from "./fields";

export const userSchema = z.object({
  name: personName(),
  email: email(),
});

export type UserFormValues = z.input<typeof userSchema>;
export type UserInput = z.output<typeof userSchema>;
