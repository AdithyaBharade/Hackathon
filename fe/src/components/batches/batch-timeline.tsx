import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBatchTimeline } from "@/services/batches/batches.queries";
import type { AuditEvent } from "@/types/batch";

const LABEL: Record<string, string> = {
  CREATED: "Batch created",
  SEEDED: "Demo data loaded",
  CANDIDATES_UPLOADED: "Candidates uploaded",
  SUBMITTED: "Sent for approval",
  RESUBMITTED: "Fixed and resent (approvals reset)",
  DECISION_APPROVE: "Approved",
  DECISION_REJECT: "Rejected",
  DECISION_SEND_BACK: "Sent back",
  DECISION_RETRACTED: "Withdrew their approval",
  STATUS_CHANGED: "Moved to next stage",
  ESCALATED: "Flagged as stuck",
  CERTIFICATES_ISSUED: "Certificates issued",
};

const detail = (e: AuditEvent) => {
  const d = e.data ?? {};
  if (e.action === "CANDIDATES_UPLOADED") return `${d.count} candidates from ${d.file}`;
  if (e.action === "STATUS_CHANGED") return `${String(d.from).replace("PENDING_", "").toLowerCase()} → ${String(d.to).replace("PENDING_", "").toLowerCase()}`;
  if (e.action === "CERTIFICATES_ISSUED") return `${d.count} certificates`;
  if (e.action === "ESCALATED") return `waited ${d.waitingMin} min`;
  if (typeof d.reason === "string" && d.reason) return `"${d.reason}"`;
  if (typeof d.version === "number") return `version ${d.version}`;
  return "";
};

/** Who did what, when, at which request: the batch's full audit trail. */
export function BatchTimeline({ batchId }: { batchId: string }) {
  const { data, isLoading } = useBatchTimeline(batchId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit trail</CardTitle>
        <CardDescription>Every action on this batch, by whom and when. Request ids match the server logs.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-24 w-full" />}
        <ol className="space-y-3">
          {data?.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 border-l-2 pl-3 sm:flex-row sm:items-baseline sm:justify-between">
              <div className="text-sm">
                <span className="font-medium">{LABEL[e.action] ?? e.action}</span>
                <span className="text-muted-foreground"> · {e.actorName ?? "System"}</span>
                {detail(e) && <div className="text-muted-foreground">{detail(e)}</div>}
              </div>
              <div className="text-xs text-muted-foreground sm:text-right">
                {format(new Date(e.createdAt), "d MMM, HH:mm:ss")}
                {e.requestId && <div className="font-mono">{e.requestId.slice(0, 8)}</div>}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
