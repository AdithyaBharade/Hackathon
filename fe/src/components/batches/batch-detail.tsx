import { useMemo } from "react";
import { useParams } from "react-router";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { format } from "date-fns";
import { InfoIcon } from "lucide-react";
import { DataGrid } from "@/components/common/data-grid";
import { PageHeader } from "@/components/common/page-header";
import { ErrorState, PageLoader } from "@/components/common/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store/auth.store";
import { useBatch } from "@/services/batches/batches.queries";
import type { Candidate } from "@/types/batch";
import { BatchStatusBadge, DeliveryBadge } from "./batch-status-badge";
import { BatchTimeline } from "./batch-timeline";
import { CentreActions } from "./centre-actions";
import { ReviewerActions } from "./reviewer-actions";
import { WorkflowProgress } from "./workflow-progress";

export function BatchDetailView() {
  const { id = "" } = useParams();
  const user = useAuthStore((s) => s.user)!;
  const isMobile = useIsMobile();
  const { data: batch, isLoading, error, refetch } = useBatch(id);

  const columns = useMemo<ColDef<Candidate>[]>(
    () => [
      { field: "rowNumber", headerName: "Row", maxWidth: 80, hide: isMobile },
      { field: "name", minWidth: 160 },
      { field: "mobile", minWidth: 130, hide: isMobile },
      { field: "dateOfBirth", headerName: "Date of birth", hide: isMobile, valueFormatter: (p) => format(new Date(p.value), "dd/MM/yyyy") },
      { field: "grade", maxWidth: 100 },
      { field: "certificate.number", headerName: "Certificate", minWidth: 160, valueFormatter: (p) => p.value ?? "-" },
      {
        headerName: "Delivery",
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams<Candidate>) => {
          const c = p.data?.certificate;
          if (!c) return <span className="text-muted-foreground">-</span>;
          if (c.status === "REVOKED") return <span className="text-destructive">Revoked</span>;
          return <DeliveryBadge status={c.deliveryStatus} />;
        },
      },
    ],
    [isMobile]
  );

  if (isLoading) return <PageLoader />;
  if (error || !batch) return <ErrorState message={error?.message ?? "Batch not found"} onRetry={() => refetch()} />;

  const isOwnerCentre = user.role === "CENTRE";
  const editable = batch.status === "DRAFT" || batch.status === "SENT_BACK";
  const certs = batch.candidates.map((c) => c.certificate).filter((c) => !!c);
  const sent = certs.filter((c) => c.deliveryStatus === "SENT").length;
  const failed = certs.filter((c) => c.deliveryStatus === "FAILED").length;

  return (
    <>
      <PageHeader
        back={{ to: "/", label: "Back to batches" }}
        title={batch.courseName}
        description={`${batch.code} · ${batch.centre.name} · ${batch.district.name} · ${batch.candidateCount} candidates`}
        actions={<BatchStatusBadge status={batch.status} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <WorkflowProgress batch={batch} />
          {(batch.status === "SENT_BACK" || batch.status === "REJECTED") && batch.lastReason && (
            <Alert variant={batch.status === "REJECTED" ? "destructive" : "default"}>
              <InfoIcon />
              <AlertTitle>{batch.status === "REJECTED" ? "Rejected" : "Sent back for changes"}</AlertTitle>
              <AlertDescription>{batch.lastReason}</AlertDescription>
            </Alert>
          )}
          {batch.escalatedAt && batch.status.startsWith("PENDING") && (
            <Alert variant="destructive">
              <InfoIcon />
              <AlertTitle>Flagged as stuck</AlertTitle>
              <AlertDescription>This batch waited too long at this stage and the state office has been alerted.</AlertDescription>
            </Alert>
          )}
          {batch.status === "APPROVED" && (
            <p className="text-sm text-muted-foreground">
              {certs.length} of {batch.candidateCount} certificates issued · {sent} delivered on WhatsApp
              {failed > 0 && ` · ${failed} failed (the state office can resend)`}
            </p>
          )}
        </CardContent>
      </Card>

      {isOwnerCentre && editable && <CentreActions batch={batch} />}
      {batch.workflow.canAct && <ReviewerActions batch={batch} />}

      <Card>
        <CardHeader>
          <CardTitle>Candidates</CardTitle>
          {!isOwnerCentre && <CardDescription>Mobile numbers are masked outside the training centre.</CardDescription>}
        </CardHeader>
        <CardContent>
          <DataGrid<Candidate> rowData={batch.candidates} columnDefs={columns} getRowId={(p) => p.data.id} className="h-80 md:h-96" />
        </CardContent>
      </Card>

      <BatchTimeline batchId={batch.id} />
    </>
  );
}
