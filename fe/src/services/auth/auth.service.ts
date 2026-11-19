import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/api";
import type { AuthResponse } from "@/types/auth";
import type { User } from "@/types/user";
import type { LoginInput, RegisterInput } from "@/schemas/auth.schema";

export const authService = {
  login: async (body: LoginInput) =>
    (await api.post<ApiResponse<AuthResponse>>(ENDPOINTS.auth.login, body)).data.data,
  register: async (body: RegisterInput) =>
    (await api.post<ApiResponse<AuthResponse>>(ENDPOINTS.auth.register, body)).data.data,
  me: async () => (await api.get<ApiResponse<User>>(ENDPOINTS.auth.me)).data.data,
};
