import "@/lib/ag-grid";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { gridTheme } from "@/lib/ag-grid";
import { cn } from "@/lib/utils";

type DataGridProps<T> = AgGridReactProps<T> & {
  /** Tailwind height classes; shorter on mobile by default */
  className?: string;
};

/**
 * The only table component in the app. Wraps AG Grid with the shared theme and defaults.
 * Columns: give key columns a `minWidth`, and hide low-priority ones on mobile (`hide: isMobile`).
 */
export function DataGrid<T>({ className, ...props }: DataGridProps<T>) {
  return (
    <div className={cn("h-[420px] w-full md:h-[520px]", className)}>
      <AgGridReact<T>
        theme={gridTheme}
        defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1, minWidth: 120 }}
        overlayNoRowsTemplate="No records found"
        {...props}
      />
    </div>
  );
}
