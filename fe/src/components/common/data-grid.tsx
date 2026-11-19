import "@/lib/ag-grid";
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { gridTheme } from "@/lib/ag-grid";

type DataGridProps<T> = AgGridReactProps<T> & { height?: number | string };

export function DataGrid<T>({ height = 500, ...props }: DataGridProps<T>) {
  return (
    <div style={{ height, width: "100%" }}>
      <AgGridReact<T>
        theme={gridTheme}
        pagination
        paginationPageSize={20}
        defaultColDef={{ sortable: true, filter: true, resizable: true, flex: 1 }}
        {...props}
      />
    </div>
  );
}
