interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons/actions shown on the right (stack under the title on mobile) */
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row">{actions}</div>}
    </div>
  );
}
