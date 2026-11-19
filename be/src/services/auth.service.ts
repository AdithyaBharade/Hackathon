import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { signToken } from "../utils/jwt.js";
import { publicUserSelect } from "../utils/selects.js";
import { enqueueEmail } from "../jobs/queues/email.queue.js";
import { invalidate } from "../utils/cache.js";
import type { LoginInput, RegisterInput } from "../validators/auth.validator.js";

export const authService = {
  async register({ name, email, password }: RegisterInput) {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hash }, select: publicUserSelect });
    await invalidate("users:all");
    await enqueueEmail({ to: user.email, subject: "Welcome!", body: `Hi ${user.name}, welcome aboard.` });
    return { user, token: signToken({ sub: user.id, role: user.role }) };
  },

  async login({ email, password }: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password)))
      throw new ApiError(401, "Invalid email or password");
    const { password: _pw, ...safe } = user;
    return { user: safe, token: signToken({ sub: user.id, role: user.role }) };
  },

  me: (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUserSelect }),
};
