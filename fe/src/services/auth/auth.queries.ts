import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authService } from "./auth.service";
import { queryKeys } from "@/services/api/query-keys";
import { useAuthStore } from "@/store/auth.store";

const useOnAuthSuccess = () => {
  const setUser = useAuthStore((s) => s.setUser);
  const navigate = useNavigate();
  return ({ user }: { user: Parameters<typeof setUser>[0] }) => {
    setUser(user);
    navigate("/", { replace: true });
  };
};

export const useLogin = () => {
  const qc = useQueryClient();
  const onSuccess = useOnAuthSuccess();
  return useMutation({
    mutationFn: authService.login,
    // Switching demo persona: never show the previous person's cached data
    onSuccess: (data) => {
      qc.clear();
      onSuccess(data);
    },
    meta: { successMessage: "Welcome back!" },
  });
};

/** Validates the cookie session on load (refreshes automatically via the axios interceptor). */
export const useMe = (enabled: boolean) => {
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({ queryKey: queryKeys.me, queryFn: authService.me, enabled, retry: false });
  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);
  return query;
};

export const useLogout = () => {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.logout,
    meta: { silentError: true }, // always log out locally, even if the API call fails
    onSettled: () => {
      clear();
      qc.clear();
      navigate("/login", { replace: true });
    },
  });
};
