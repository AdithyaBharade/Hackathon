import { Link } from "react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons/actions shown on the right (stack under the title on mobile) */
  actions?: React.ReactNode;
  /** Back link shown top-left above the title, the same on every page */
  back?: { to: string; label?: string };
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {back && (
        <Button variant="ghost" size="sm" className="-ml-2" render={<Link to={back.to} />}>
          <ArrowLeftIcon className="size-4" /> {back.label ?? "Back"}
        </Button>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
      </div>
    </div>
  );
}
