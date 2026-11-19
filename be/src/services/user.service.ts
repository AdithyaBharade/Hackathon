import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import { cached, invalidatePrefix } from "../utils/cache.js";
import { paginated, toSkipTake } from "../utils/paginate.js";
import { publicUserSelect } from "../utils/selects.js";
import type { PaginationQuery } from "../validators/common.validator.js";
import type { UpdateUserInput } from "../validators/user.validator.js";

export const USERS_CACHE_PREFIX = "users:list:";

export const userService = {
  findAll: ({ page, limit, search }: PaginationQuery) =>
    cached(`${USERS_CACHE_PREFIX}${page}:${limit}:${search ?? ""}`, 60, async () => {
      const where: Prisma.UserWhereInput = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {};
      const [items, total] = await prisma.$transaction([
        prisma.user.findMany({ where, select: publicUserSelect, orderBy: { createdAt: "desc" }, ...toSkipTake(page, limit) }),
        prisma.user.count({ where }),
      ]);
      return paginated(items, total, page, limit);
    }),

  findById: (id: string) => prisma.user.findUniqueOrThrow({ where: { id }, select: publicUserSelect }),

  update: async (id: string, data: UpdateUserInput) => {
    const user = await prisma.user.update({ where: { id }, data, select: publicUserSelect });
    await invalidatePrefix(USERS_CACHE_PREFIX);
    return user;
  },

  remove: async (id: string) => {
    await prisma.user.delete({ where: { id } });
    await invalidatePrefix(USERS_CACHE_PREFIX);
  },
};
