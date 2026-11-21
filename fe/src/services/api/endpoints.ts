export const ENDPOINTS = {
  health: "/health",
  events: "/events",
  auth: {
    login: "/auth/login",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    me: "/auth/me",
  },
  batches: {
    root: "/batches",
    summary: "/batches/summary",
    stuck: "/batches/stuck",
    byId: (id: string) => `/batches/${id}`,
    timeline: (id: string) => `/batches/${id}/timeline`,
    candidates: (id: string) => `/batches/${id}/candidates`,
    submit: (id: string) => `/batches/${id}/submit`,
    decisions: (id: string) => `/batches/${id}/decisions`,
    retract: (id: string) => `/batches/${id}/decisions/retract`,
  },
  certificates: {
    root: "/certificates",
    revoke: (id: string) => `/certificates/${id}/revoke`,
    resend: (id: string) => `/certificates/${id}/resend`,
  },
  notifications: "/notifications",
  public: {
    verify: (number: string) => `/public/verify/${encodeURIComponent(number)}`,
  },
} as const;
