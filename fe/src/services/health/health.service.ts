import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api/client";
import { ENDPOINTS } from "@/services/api/endpoints";
import { queryKeys } from "@/services/api/query-keys";

export const healthService = {
  check: async () =>
    (await api.get<{ status: string; db: string; redis: string }>(ENDPOINTS.health)).data,
};

export const useHealth = () =>
  useQuery({ queryKey: queryKeys.health, queryFn: healthService.check, retry: false });
