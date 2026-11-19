import { Navigate, Outlet, useLocation } from "react-router";
import { useAuthStore } from "@/store/auth.store";
import { useMe } from "@/services/auth/auth.queries";
import { Spinner } from "@/components/ui/spinner";

export function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  const { isPending } = useMe(!!user);

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (isPending)
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner />
      </div>
    );
  return <Outlet />;
}
