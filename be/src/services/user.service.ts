import { prisma } from "../config/prisma.js";
import { cached, invalidate } from "../utils/cache.js";
import { publicUserSelect } from "../utils/selects.js";
import type { UpdateUserInput } from "../validators/user.validator.js";

const KEY = "users:all";

export const userService = {
  findAll: () =>
    cached(KEY, 60, () => prisma.user.findMany({ select: publicUserSelect, orderBy: { createdAt: "desc" } })),
  findById: (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUserSelect }),
  update: async (id: string, data: UpdateUserInput) => {
    const user = await prisma.user.update({ where: { id }, data, select: publicUserSelect });
    await invalidate(KEY);
    return user;
  },
  remove: async (id: string) => {
    await prisma.user.delete({ where: { id } });
    await invalidate(KEY);
  },
};
