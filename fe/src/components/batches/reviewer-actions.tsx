import { useState } from "react";
import { CheckIcon, Undo2Icon, XIcon, CornerUpLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useDecide, useRetract } from "@/services/batches/batches.queries";
import type { BatchDetail } from "@/types/batch";
import { ReasonDialog } from "./reason-dialog";

export function ReviewerActions({ batch }: { batch: BatchDetail }) {
  const decide = useDecide();
  const retract = useRetract();
  const [dialog, setDialog] = useState<"approve" | "SEND_BACK" | "REJECT" | null>(null);
  const { myDecision, currentApprovals, requiredApprovals, stage } = batch.workflow;

  if (myDecision)
    return (
      <Card>
        <CardHeader>
          <CardTitle>You approved this batch</CardTitle>
          <CardDescription>
            {currentApprovals} of {requiredApprovals} approvals so far. Made a mistake? You can withdraw your approval while this stage is still open.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full sm:w-auto" disabled={retract.isPending} onClick={() => retract.mutate(batch.id)}>
            <Undo2Icon className="size-4" /> Withdraw my approval
          </Button>
        </CardContent>
      </Card>
    );

  const run = (action: "APPROVE" | "SEND_BACK" | "REJECT", reason?: string) =>
    decide.mutate({ id: batch.id, action, reason, version: batch.version }, { onSettled: () => setDialog(null) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your decision</CardTitle>
        <CardDescription>
          {stage === "DISTRICT"
            ? `${requiredApprovals} district officers must approve. ${currentApprovals} have so far.`
            : stage === "QUALITY"
              ? "Large batch: quality check before the state office."
              : "Final approval. Certificates are issued and sent on WhatsApp as soon as you approve."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full sm:w-auto" disabled={decide.isPending} onClick={() => setDialog("approve")}>
          <CheckIcon className="size-4" /> Approve
        </Button>
        <Button variant="outline" className="w-full sm:w-auto" disabled={decide.isPending} onClick={() => setDialog("SEND_BACK")}>
          <CornerUpLeftIcon className="size-4" /> Send back
        </Button>
        <Button variant="destructive" className="w-full sm:w-auto" disabled={decide.isPending} onClick={() => setDialog("REJECT")}>
          <XIcon className="size-4" /> Reject
        </Button>
      </CardContent>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Approve ${batch.candidateCount} candidates?`}
        description={stage === "STATE" ? "This issues the certificates and sends them to every candidate on WhatsApp." : "Your approval is recorded under your name with the time."}
        confirmLabel="Approve"
        destructive={false}
        loading={decide.isPending}
        onConfirm={() => run("APPROVE")}
      />
      <ReasonDialog
        open={dialog === "SEND_BACK"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Send back to the centre"
        description="The centre can fix the batch and resend it. When they do, everyone reviews it again."
        confirmLabel="Send back"
        loading={decide.isPending}
        onConfirm={(r) => run("SEND_BACK", r)}
      />
      <ReasonDialog
        open={dialog === "REJECT"}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Reject this batch"
        description="Rejection is final. The centre would have to create a new batch."
        confirmLabel="Reject"
        destructive
        loading={decide.isPending}
        onConfirm={(r) => run("REJECT", r)}
      />
    </Card>
  );
}
