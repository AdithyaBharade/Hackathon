import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authService } from "./auth.service";
import { useAuthStore } from "@/store/auth.store";

export const useLogin = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.login,
    onSuccess: ({ user, token }) => {
      setAuth(user, token);
      navigate("/");
    },
  });
};

export const useRegister = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authService.register,
    onSuccess: ({ user, token }) => {
      setAuth(user, token);
      navigate("/");
    },
  });
};
