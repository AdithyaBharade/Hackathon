import { useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { SearchIcon, Trash2Icon } from "lucide-react";
import { DataGrid } from "@/components/common/data-grid";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useDeleteUser, useUsers } from "@/services/users/users.queries";
import type { User } from "@/types/user";

const PAGE_SIZE = 20;

export function UsersTable() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [toDelete, setToDelete] = useState<User | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useUsers({ page, limit: PAGE_SIZE, search: debouncedSearch || undefined });
  const deleteUser = useDeleteUser();

  const columns = useMemo<ColDef<User>[]>(
    () => [
      { field: "name", minWidth: 140 },
      { field: "email", minWidth: 200 },
      {
        field: "role",
        maxWidth: 120,
        hide: isMobile,
        cellRenderer: (p: ICellRendererParams<User>) => <Badge variant="secondary">{p.value}</Badge>,
      },
      {
        field: "createdAt",
        headerName: "Created",
        hide: isMobile,
        valueFormatter: (p) => new Date(p.value).toLocaleDateString(),
      },
      {
        headerName: "",
        sortable: false,
        filter: false,
        resizable: false,
        width: 72,
        minWidth: 72,
        maxWidth: 72,
        pinned: "right",
        cellRenderer: (p: ICellRendererParams<User>) => (
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${p.data?.name}`} onClick={() => p.data && setToDelete(p.data)}>
            <Trash2Icon className="size-4 text-destructive" />
          </Button>
        ),
      },
    ],
    [isMobile]
  );

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone registered on the platform."
        actions={
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search name or email" aria-label="Search users" value={search} onChange={(e) => onSearch(e.target.value)} />
          </InputGroup>
        }
      />

      <Card>
        <CardContent className="space-y-4">
          {error ? (
            <ErrorState message={error.message} onRetry={() => refetch()} />
          ) : !isLoading && data?.total === 0 ? (
            <EmptyState
              title={debouncedSearch ? "No matching users" : "No users yet"}
              description={debouncedSearch ? "Try a different search." : "Users appear here once they register."}
            />
          ) : (
            <>
              <DataGrid<User> rowData={data?.items} columnDefs={columns} loading={isLoading} getRowId={(p) => p.data.id} />
              {data && (
                <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isFetching} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description="This permanently removes the user and signs them out everywhere."
        confirmLabel="Delete"
        loading={deleteUser.isPending}
        onConfirm={() => toDelete && deleteUser.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
