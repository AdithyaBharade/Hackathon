import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { publicUserSelect } from "../utils/selects.js";
import { tokenService, type ClientMeta } from "./token.service.js";
import type { LoginInput } from "../validators/auth.validator.js";

// Accounts are provisioned by the programme office (seeded for the demo).
// There is deliberately no self-registration: a role decides what a user may approve.
export const authService = {
  async login({ email, password }: LoginInput, meta: ClientMeta) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new ApiError(401, "Invalid email or password");
    const tokens = await tokenService.issue(user, meta);
    return { user: await authService.me(user.id), tokens };
  },

  me: (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUserSelect }),
};
