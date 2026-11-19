import { InboxIcon, OctagonXIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

/** Standard error block for failed queries. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <OctagonXIcon />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        {message}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** Standard empty block for lists with no data. */
export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

/** Full-area loader (page level). For lists prefer Skeleton or the grid's own loading overlay. */
export function PageLoader() {
  return (
    <div className="flex min-h-[50svh] items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}
