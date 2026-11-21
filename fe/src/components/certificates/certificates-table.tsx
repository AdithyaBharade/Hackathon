import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { BanIcon, RotateCwIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { DataGrid } from "@/components/common/data-grid";
import { PageHeader } from "@/components/common/page-header";
import { PaginationBar } from "@/components/common/pagination-bar";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DeliveryBadge } from "@/components/batches/batch-status-badge";
import { ReasonDialog } from "@/components/batches/reason-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuthStore } from "@/store/auth.store";
import { useCertificates, useResendCertificate, useRevokeCertificate } from "@/services/certificates/certificates.queries";
import type { CertificateRow } from "@/types/batch";

const PAGE_SIZE = 20;

export function CertificatesTable() {
  const isMobile = useIsMobile();
  const isState = useAuthStore((s) => s.user?.role === "STATE");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [toRevoke, setToRevoke] = useState<CertificateRow | null>(null);
  const { data, isLoading, isFetching, error, refetch } = useCertificates({ page, limit: PAGE_SIZE, search: debounced || undefined });
  const revoke = useRevokeCertificate();
  const resend = useResendCertificate();

  const columns = useMemo<ColDef<CertificateRow>[]>(
    () => [
      { field: "number", minWidth: 170 },
      { field: "candidate.name", headerName: "Candidate", minWidth: 150 },
      { field: "batch.courseName", headerName: "Course", minWidth: 160, hide: isMobile },
      { field: "batch.centre.name", headerName: "Centre", minWidth: 170, hide: isMobile },
      { field: "issuedAt", headerName: "Issued", hide: isMobile, valueFormatter: (p) => format(new Date(p.value), "d MMM yyyy") },
      {
        headerName: "Status",
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<CertificateRow>) =>
          p.data && (p.data.status === "REVOKED" ? <Badge variant="destructive">Revoked</Badge> : <DeliveryBadge status={p.data.deliveryStatus} />),
      },
      {
        headerName: "",
        sortable: false,
        filter: false,
        pinned: "right",
        width: isState ? 150 : 72,
        minWidth: isState ? 150 : 72,
        maxWidth: isState ? 150 : 72,
        cellRenderer: (p: ICellRendererParams<CertificateRow>) =>
          p.data && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Verify publicly" render={<Link to={`/verify/${p.data.number}`} target="_blank" />}>
                <ShieldCheckIcon className="size-4" />
              </Button>
              {isState && p.data.status === "ISSUED" && p.data.deliveryStatus === "FAILED" && (
                <Button variant="ghost" size="icon-sm" aria-label="Resend on WhatsApp" disabled={resend.isPending} onClick={() => resend.mutate(p.data!.id)}>
                  <RotateCwIcon className="size-4" />
                </Button>
              )}
              {isState && p.data.status === "ISSUED" && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setToRevoke(p.data!)}>
                  <BanIcon className="size-4" /> Revoke
                </Button>
              )}
            </div>
          ),
      },
    ],
    [isMobile, isState, resend]
  );

  return (
    <>
      <PageHeader
        back={{ to: "/", label: "Back to batches" }}
        title="Certificates"
        description={isState ? "Everything issued. Revoke a certificate that should never have been issued." : "Certificates issued to your candidates."}
        actions={
          <InputGroup className="w-full sm:w-64">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search number or name"
              aria-label="Search certificates"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
        }
      />
      <Card>
        <CardContent className="space-y-4">
          {error ? (
            <ErrorState message={error.message} onRetry={() => refetch()} />
          ) : !isLoading && data?.total === 0 ? (
            <EmptyState title="No certificates yet" description="They appear here as soon as a batch gets final approval." />
          ) : (
            <>
              <DataGrid<CertificateRow> rowData={data?.items} columnDefs={columns} loading={isLoading} getRowId={(p) => p.data.id} />
              {data && <PaginationBar page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} disabled={isFetching} />}
            </>
          )}
        </CardContent>
      </Card>
      <ReasonDialog
        open={!!toRevoke}
        onOpenChange={(o) => !o && setToRevoke(null)}
        title={`Revoke ${toRevoke?.number}?`}
        description="Anyone verifying this certificate will be told it is no longer valid, immediately. This cannot be undone."
        confirmLabel="Revoke certificate"
        destructive
        loading={revoke.isPending}
        onConfirm={(reason) => toRevoke && revoke.mutate({ id: toRevoke.id, reason }, { onSuccess: () => setToRevoke(null) })}
      />
    </>
  );
}
