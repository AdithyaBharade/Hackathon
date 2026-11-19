import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toast";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "./theme-provider";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Toaster>
          <TooltipProvider>{children}</TooltipProvider>
        </Toaster>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
