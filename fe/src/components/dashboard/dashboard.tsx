import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import { AlarmClockIcon, BellIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BatchesTable } from "@/components/batches/batches-table";
import { CreateBatchDialog } from "@/components/batches/create-batch-dialog";
import { BatchStatusBadge } from "@/components/batches/batch-status-badge";
import { useAuthStore } from "@/store/auth.store";
import { useBatchSummary, useNotifications, useStuckBatches } from "@/services/batches/batches.queries";
import { ROLE_LABEL } from "@/types/user";
import { STATUS_LABEL, type BatchStatus } from "@/types/batch";

const TILES: BatchStatus[] = ["DRAFT", "PENDING_DISTRICT", "PENDING_QUALITY", "PENDING_STATE", "SENT_BACK", "APPROVED"];

export function Dashboard() {
  const user = useAuthStore((s) => s.user)!;
  const summary = useBatchSummary();
  const isState = user.role === "STATE";

  const scope = user.centre?.name ?? (user.district ? `${user.district.name} district` : "All districts");

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0]}`}
        description={`${ROLE_LABEL[user.role]} · ${scope}`}
        actions={user.role === "CENTRE" ? <CreateBatchDialog /> : undefined}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {TILES.filter((s) => user.role === "CENTRE" || s !== "DRAFT").map((s) => (
          <Card key={s} size="sm">
            <CardHeader>
              <CardDescription>{STATUS_LABEL[s]}</CardDescription>
              <CardTitle className="text-2xl">{summary.isLoading ? <Skeleton className="h-7 w-10" /> : (summary.data?.[s] ?? 0)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {isState && <StateOverview />}
      <BatchesTable />
    </>
  );
}

function StateOverview() {
  const stuck = useStuckBatches(true);
  const notifications = useNotifications();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlarmClockIcon className="size-4" /> Stuck batches
          </CardTitle>
          <CardDescription>Waiting at one stage longer than allowed. Flagged automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {stuck.data?.length === 0 && <EmptyState title="Nothing is stuck" />}
          {stuck.data?.map((b) => (
            <Link key={b.id} to={`/batches/${b.id}`} className="flex flex-col gap-1 rounded-md border p-3 hover:bg-accent sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-medium">
                {b.courseName} <span className="text-muted-foreground">· {b.centre.name}</span>
              </span>
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <BatchStatusBadge status={b.status} />
                {b.stageEnteredAt && formatDistanceToNow(new Date(b.stageEnteredAt))}
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="size-4" /> Alerts
          </CardTitle>
          <CardDescription>Escalations and failed deliveries.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-72 space-y-2 overflow-y-auto">
          {notifications.data?.length === 0 && <EmptyState title="No alerts" />}
          {notifications.data?.map((n) => (
            <div key={n.id} className="rounded-md border p-3 text-sm">
              {n.batchId ? (
                <Link to={`/batches/${n.batchId}`} className="hover:underline">
                  {n.message}
                </Link>
              ) : (
                n.message
              )}
              <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
