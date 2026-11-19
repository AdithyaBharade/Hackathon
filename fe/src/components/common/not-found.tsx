import { Link } from "react-router";
import { buttonVariants } from "@/components/ui/button";

export function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background p-4 text-center">
      <h1 className="text-2xl font-semibold">404 - Page not found</h1>
      <Link to="/" className={buttonVariants()}>Go home</Link>
    </div>
  );
}
