import { CheckCircle2Icon, CircleDashedIcon, CircleDotIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BatchDetail } from "@/types/batch";

type StepState = "done" | "current" | "todo";

const BIG_BATCH_THRESHOLD = 50;

/** Submitted → District (2 officers) → [Quality] → State → Issued */
export function WorkflowProgress({ batch }: { batch: BatchDetail }) {
  const big = batch.candidateCount > BIG_BATCH_THRESHOLD;
  const order = ["DRAFT", "PENDING_DISTRICT", ...(big ? ["PENDING_QUALITY"] : []), "PENDING_STATE", "APPROVED"];
  const current = batch.status === "SENT_BACK" || batch.status === "REJECTED" ? -1 : order.indexOf(batch.status);
  const { currentApprovals, requiredApprovals } = batch.workflow;

  const steps = [
    { key: "DRAFT", label: "Submitted", detail: batch.version > 0 ? `Version ${batch.version}` : "Not yet" },
    { key: "PENDING_DISTRICT", label: "District review", detail: batch.status === "PENDING_DISTRICT" ? `${currentApprovals} of ${requiredApprovals} officers approved` : "2 officers must agree" },
    ...(big ? [{ key: "PENDING_QUALITY", label: "Quality review", detail: `Large batch (over ${BIG_BATCH_THRESHOLD})` }] : []),
    { key: "PENDING_STATE", label: "State approval", detail: "Final say" },
    { key: "APPROVED", label: "Certificates issued", detail: "Sent on WhatsApp" },
  ];

  const stateOf = (i: number): StepState => {
    if (batch.status === "APPROVED") return "done";
    if (current < 0) return i === 0 ? "done" : "todo";
    return i < current ? "done" : i === current ? "current" : "todo";
  };

  return (
    <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((s, i) => {
        const st = i === 0 && batch.version > 0 ? "done" : stateOf(i);
        const Icon = st === "done" ? CheckCircle2Icon : st === "current" ? CircleDotIcon : CircleDashedIcon;
        return (
          <li key={s.key} className={cn("flex items-start gap-2 rounded-md border p-3", st === "current" && "border-primary bg-accent")}>
            <Icon className={cn("mt-0.5 size-4 shrink-0", st === "todo" ? "text-muted-foreground" : "text-primary")} />
            <div>
              <div className={cn("text-sm font-medium", st === "todo" && "text-muted-foreground")}>{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.detail}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
