import type { PaginationParams } from "@/types/api";

export const queryKeys = {
  health: ["health"] as const,
  me: ["auth", "me"] as const,
  batches: {
    all: ["batches"] as const,
    list: (params: PaginationParams & { status?: string; inbox?: boolean }) => ["batches", "list", params] as const,
    summary: ["batches", "summary"] as const,
    stuck: ["batches", "stuck"] as const,
    detail: (id: string) => ["batches", "detail", id] as const,
    timeline: (id: string) => ["batches", "timeline", id] as const,
  },
  certificates: {
    all: ["certificates"] as const,
    list: (params: PaginationParams & { batchId?: string; status?: string }) => ["certificates", "list", params] as const,
  },
  notifications: ["notifications"] as const,
  verify: (number: string) => ["verify", number] as const,
};
