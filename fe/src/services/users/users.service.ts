import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import type { ApiResponse } from "@/types/api";
import type { User } from "@/types/user";
import type { UserInput } from "@/schemas/user.schema";

export const usersService = {
  getAll: async () => (await api.get<ApiResponse<User[]>>(ENDPOINTS.users.root)).data.data,
  getById: async (id: string) =>
    (await api.get<ApiResponse<User>>(ENDPOINTS.users.byId(id))).data.data,
  update: async (id: string, body: Partial<UserInput>) =>
    (await api.put<ApiResponse<User>>(ENDPOINTS.users.byId(id), body)).data.data,
  remove: async (id: string) => {
    await api.delete(ENDPOINTS.users.byId(id));
  },
};
