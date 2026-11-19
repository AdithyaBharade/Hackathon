import type { PaginationParams } from "@/types/api";

export const queryKeys = {
  health: ["health"] as const,
  me: ["auth", "me"] as const,
  users: {
    all: ["users"] as const,
    list: (params: PaginationParams) => ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
  },
};
