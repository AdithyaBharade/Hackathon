import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Server-side pagination controls shown under a DataGrid. */
export function PaginationBar({ page, totalPages, total, onPageChange, disabled }: PaginationBarProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Previous page" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="min-w-24 text-center">Page {page} of {totalPages}</span>
        <Button variant="outline" size="icon" aria-label="Next page" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
