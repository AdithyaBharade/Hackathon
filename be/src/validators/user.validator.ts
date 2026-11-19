import { z } from "zod";
import { email, personName } from "./fields.js";

export const updateUserSchema = z
  .object({
    name: personName().optional(),
    email: email().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field to update");

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
