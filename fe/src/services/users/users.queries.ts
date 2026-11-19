import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "./users.service";
import { queryKeys } from "@/services/api/query-keys";
import type { PaginationParams } from "@/types/api";
import type { UserInput } from "@/schemas/user.schema";

export const useUsers = (params: PaginationParams) =>
  useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersService.getAll(params),
    placeholderData: keepPreviousData, // keep old rows visible while the next page loads
  });

export const useUser = (id: string) =>
  useQuery({ queryKey: queryKeys.users.detail(id), queryFn: () => usersService.getById(id) });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<UserInput> }) => usersService.update(id, body),
    meta: { successMessage: "User updated" },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.remove,
    meta: { successMessage: "User deleted" },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
};
