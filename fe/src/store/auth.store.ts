import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/user";

/**
 * Tokens live in httpOnly cookies (not readable by JS).
 * We only keep the user profile here so the UI knows who is logged in.
 */
interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null }),
    }),
    { name: "auth-user" }
  )
);
