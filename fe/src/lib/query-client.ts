import { MutationCache, QueryClient } from "@tanstack/react-query";
import { notify } from "./notify";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: {
      /** Toast shown when the mutation succeeds */
      successMessage?: string;
      /** Set true to handle errors yourself (no automatic error toast) */
      silentError?: boolean;
    };
  }
}

export const queryClient = new QueryClient({
  // Every mutation gets an error toast automatically, and a success toast via meta.successMessage
  mutationCache: new MutationCache({
    onSuccess: (_data, _vars, _ctx, mutation) => {
      const msg = mutation.meta?.successMessage;
      if (msg) notify.success(msg);
    },
    onError: (error, _vars, _ctx, mutation) => {
      if (!mutation.meta?.silentError) notify.error(error.message);
    },
  }),
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});
