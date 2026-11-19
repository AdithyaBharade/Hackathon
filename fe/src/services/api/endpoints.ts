export const ENDPOINTS = {
  health: "/health",
  auth: {
    login: "/auth/login",
    register: "/auth/register",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    me: "/auth/me",
  },
  users: {
    root: "/users",
    byId: (id: string) => `/users/${id}`,
  },
} as const;
