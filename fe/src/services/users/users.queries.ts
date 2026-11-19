import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersService } from "./users.service";
import { queryKeys } from "@/services/api/query-keys";
import type { UserInput } from "@/schemas/user.schema";

export const useUsers = () =>
  useQuery({ queryKey: queryKeys.users.all, queryFn: usersService.getAll });

export const useUser = (id: string) =>
  useQuery({ queryKey: queryKeys.users.detail(id), queryFn: () => usersService.getById(id) });

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<UserInput> }) =>
      usersService.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersService.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
};
