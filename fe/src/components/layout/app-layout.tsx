import { Link, NavLink, Outlet } from "react-router";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";
import { APP_NAME } from "@/constants";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Home" },
  { to: "/users", label: "Users" },
];

export function AppLayout() {
  const { user, logout } = useAuthStore();
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link to="/" className="font-semibold">{APP_NAME}</Link>
          <nav className="flex gap-4 text-sm">
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} end
                className={({ isActive }) => cn("text-muted-foreground hover:text-foreground", isActive && "text-foreground font-medium")}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
}
