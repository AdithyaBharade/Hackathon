export const ENDPOINTS = {
  health: "/health",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    me: "/auth/me",
  },
  users: {
    root: "/users",
    byId: (id: string) => `/users/${id}`,
  },
} as const;
