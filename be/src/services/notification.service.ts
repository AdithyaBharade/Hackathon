import { prisma } from "../config/prisma.js";
import type { ActionContext } from "../lib/context.js";

export const notificationService = {
  list: ({ user }: ActionContext) =>
    prisma.notification.findMany({
      where: { role: user.role, OR: [{ districtId: null }, { districtId: user.districtId ?? "__none__" }] },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
};
