import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { formatDistanceToNow } from "date-fns";
import { AlarmClockIcon, SearchIcon } from "lucide-react";
import { DataGrid } from "@/components/common/data-grid";
import { PaginationBar } from "@/components/common/pagination-bar";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useBatches } from "@/services/batches/batches.queries";
import type { BatchSummary } from "@/types/batch";
import { BatchStatusBadge } from "./batch-status-badge";

const PAGE_SIZE = 20;

export function BatchesTable() {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<"inbox" | "all">("inbox");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const { data, isLoading, isFetching, error, refetch } = useBatches({
    page,
    limit: PAGE_SIZE,
    search: debounced || undefined,
    inbox: tab === "inbox" || undefined,
  });

  const columns = useMemo<ColDef<BatchSummary>[]>(
    () => [
      {
        field: "courseName",
        headerName: "Batch",
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<BatchSummary>) =>
          p.data && (
            <Link to={`/batches/${p.data.id}`} className="font-medium underline-offset-4 hover:underline">
              {p.data.courseName}
            </Link>
          ),
      },
      { field: "code", minWidth: 200, hide: isMobile },
      { field: "centre.name", headerName: "Centre", minWidth: 180, hide: isMobile },
      { field: "candidateCount", headerName: "Candidates", maxWidth: 130, hide: isMobile },
      {
        field: "status",
        minWidth: 170,
        cellRenderer: (p: ICellRendererParams<BatchSummary>) =>
          p.data && (
            <span className="flex items-center gap-2">
              <BatchStatusBadge status={p.data.status} />
              {p.data.escalatedAt && <AlarmClockIcon className="size-4 text-destructive" aria-label="Stuck" />}
            </span>
          ),
      },
      {
        field: "stageEnteredAt",
        headerName: "In this stage",
        hide: isMobile,
        valueFormatter: (p) => (p.value ? formatDistanceToNow(new Date(p.value)) : "-"),
      },
      {
        headerName: "",
        sortable: false,
        filter: false,
        width: 96,
        minWidth: 96,
        maxWidth: 96,
        pinned: "right",
        cellRenderer: (p: ICellRendererParams<BatchSummary>) =>
          p.data && (
            <Button variant="outline" size="sm" render={<Link to={`/batches/${p.data.id}`} />}>
              Open
            </Button>
          ),
      },
    ],
    [isMobile]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Batches</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as "inbox" | "all");
              setPage(1);
            }}
          >
            <TabsList>
              <TabsTrigger value="inbox">Waiting for me</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <InputGroup className="w-full sm:w-56">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search course or code"
              aria-label="Search batches"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <ErrorState message={error.message} onRetry={() => refetch()} />
        ) : !isLoading && data?.total === 0 ? (
          <EmptyState
            title={tab === "inbox" ? "Nothing waiting for you" : "No batches yet"}
            description={tab === "inbox" ? "New work shows up here as soon as it arrives." : undefined}
          />
        ) : (
          <>
            <DataGrid<BatchSummary> rowData={data?.items} columnDefs={columns} loading={isLoading} getRowId={(p) => p.data.id} className="h-96 md:h-[480px]" />
            {data && <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isFetching} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
