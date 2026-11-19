import { useEffect } from "react";
import { useThemeStore } from "@/store/theme.store";

/** Keeps the `dark` class on <html> in sync with the selected theme (and the OS when "system"). */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && mql.matches));
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [theme]);

  return children;
}
