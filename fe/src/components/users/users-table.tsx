import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { DataGrid } from "@/components/common/data-grid";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeleteUser, useUsers } from "@/services/users/users.queries";
import type { User } from "@/types/user";

export function UsersTable() {
  const { data = [], isLoading, error } = useUsers();
  const deleteUser = useDeleteUser();

  const columns: ColDef<User>[] = [
    { field: "name" },
    { field: "email" },
    { field: "role", maxWidth: 120 },
    { field: "createdAt", headerName: "Created", valueFormatter: (p) => new Date(p.value).toLocaleString() },
    {
      headerName: "Actions", sortable: false, filter: false, maxWidth: 120,
      cellRenderer: (p: ICellRendererParams<User>) => (
        <Button variant="destructive" size="sm" onClick={() => p.data && deleteUser.mutate(p.data.id)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-sm text-destructive">{error.message}</p>}
        <DataGrid<User> rowData={data} columnDefs={columns} loading={isLoading} />
      </CardContent>
    </Card>
  );
}
