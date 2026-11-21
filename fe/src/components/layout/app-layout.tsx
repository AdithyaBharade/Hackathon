import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import { AwardIcon, HomeIcon, LogOutIcon, MenuIcon, ShieldCheckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { ROLE_LABEL } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { useAuthStore } from "@/store/auth.store";
import { useLogout } from "@/services/auth/auth.queries";
import { APP_NAME } from "@/constants";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Batches", icon: HomeIcon },
  { to: "/certificates", label: "Certificates", icon: AwardIcon },
  { to: "/verify", label: "Verify", icon: ShieldCheckIcon },
];

function NavLinks({ onNavigate, mobile }: { onNavigate?: () => void; mobile?: boolean }) {
  return nav.map(({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground",
          mobile ? "h-10 px-3 hover:bg-accent" : "h-9 px-2",
          isActive && "font-medium text-foreground",
          isActive && mobile && "bg-accent"
        )
      }
    >
      <Icon className="size-4" />
      {label}
    </NavLink>
  ));
}

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const live = useLiveUpdates(user?.role);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}>
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader>
                <SheetTitle>{APP_NAME}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4">
                <NavLinks mobile onNavigate={() => setOpen(false)} />
              </nav>
              <Separator />
              <div className="flex flex-col gap-2 px-4">
                <span className="truncate text-sm text-muted-foreground">{user?.name} · {user && ROLE_LABEL[user.role]}</span>
                <Button variant="outline" className="w-full" disabled={logout.isPending} onClick={() => logout.mutate()}>
                  <LogOutIcon className="size-4" /> Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="truncate font-semibold">{APP_NAME}</Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            <NavLinks />
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Badge variant={live ? "secondary" : "outline"} title={live ? "Updates appear without refreshing" : "Reconnecting..."}>
              {live ? "● Live" : "○ Offline"}
            </Badge>
            <span className="hidden max-w-56 truncate text-sm text-muted-foreground lg:inline">
              {user?.name} · {user && ROLE_LABEL[user.role]}
            </span>
            <ThemeToggle />
            <Button variant="outline" size="sm" className="hidden md:inline-flex" disabled={logout.isPending} onClick={() => logout.mutate()}>
              <LogOutIcon className="size-4" /> Switch user
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
