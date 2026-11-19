import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeStore, type Theme } from "@/store/theme.store";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Change theme" />}>
        <SunIcon className="size-5 dark:hidden" />
        <MoonIcon className="hidden size-5 dark:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
          <DropdownMenuRadioItem value="light"><SunIcon className="size-4" /> Light</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark"><MoonIcon className="size-4" /> Dark</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system"><MonitorIcon className="size-4" /> System</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
