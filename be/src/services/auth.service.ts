import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { publicUserSelect } from "../utils/selects.js";
import { enqueueEmail } from "../jobs/queues/email.queue.js";
import { invalidatePrefix } from "../utils/cache.js";
import { USERS_CACHE_PREFIX } from "./user.service.js";
import { tokenService, type ClientMeta } from "./token.service.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validator.js";

export const authService = {
  async register({ name, email, password }: RegisterInput, meta: ClientMeta) {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hash }, select: publicUserSelect });
    await invalidatePrefix(USERS_CACHE_PREFIX);
    await enqueueEmail({ to: user.email, subject: "Welcome!", body: `Hi ${user.name}, welcome aboard.` });
    return { user, tokens: await tokenService.issue(user, meta) };
  },

  async login({ email, password }: LoginInput, meta: ClientMeta) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new ApiError(401, "Invalid email or password");
    const { password: _pw, ...safe } = user;
    return { user: safe, tokens: await tokenService.issue(user, meta) };
  },

  me: (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUserSelect }),
};
