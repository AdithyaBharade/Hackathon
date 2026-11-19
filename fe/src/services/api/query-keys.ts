export const queryKeys = {
  health: ["health"] as const,
  me: ["auth", "me"] as const,
  users: {
    all: ["users"] as const,
    detail: (id: string) => ["users", id] as const,
  },
};
