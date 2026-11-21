import { useRef, useState } from "react";
import { FileSpreadsheetIcon, SendIcon, UploadIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError } from "@/services/api/client";
import { useSubmitBatch, useUploadCandidates } from "@/services/batches/batches.queries";
import { notify } from "@/lib/notify";
import type { BatchDetail, RowError } from "@/types/batch";

/** Upload the spreadsheet (all rows or none) and send for approval. */
export function CentreActions({ batch }: { batch: BatchDetail }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [rowErrors, setRowErrors] = useState<{ message: string; errors: RowError[] } | null>(null);
  const upload = useUploadCandidates();
  const submit = useSubmitBatch();
  const resend = batch.status === "SENT_BACK";

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setRowErrors(null);
    upload.mutate(
      { id: batch.id, file },
      {
        onError: (err) => {
          const errors = err instanceof ApiRequestError ? ((err.errors as RowError[] | undefined) ?? []) : [];
          setRowErrors({ message: err.message, errors });
          notify.error("Upload rejected", err.message);
        },
      }
    );
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{resend ? "Fix and resend" : "Candidates and submission"}</CardTitle>
        <CardDescription>
          Upload a CSV or XLSX with columns <strong>name, mobile, date of birth, grade</strong>. If any row has a problem, nothing is saved and every
          problem is listed. Uploading again replaces the list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input ref={fileInput} type="file" accept=".csv,.xlsx" className="hidden" aria-label="Candidate spreadsheet" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button variant="outline" className="w-full sm:w-auto" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
            <UploadIcon className="size-4" /> {upload.isPending ? "Checking rows..." : batch.candidateCount ? "Replace spreadsheet" : "Upload spreadsheet"}
          </Button>
          <Button className="w-full sm:w-auto" disabled={submit.isPending || batch.candidateCount === 0} onClick={() => submit.mutate(batch.id)}>
            <SendIcon className="size-4" /> {submit.isPending ? "Sending..." : resend ? "Resend for approval" : "Send for approval"}
          </Button>
        </div>
        {resend && (
          <p className="text-sm text-muted-foreground">
            Resending starts a new version: approvals given to the previous version no longer count, so the district reviews it again.
          </p>
        )}
        {rowErrors && (
          <Alert variant="destructive">
            <FileSpreadsheetIcon />
            <AlertTitle>{rowErrors.message}</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-4">
                {rowErrors.errors.map((e, i) => (
                  <li key={i}>
                    {e.row > 1 ? `Row ${e.row}` : "File"}
                    {e.field ? ` · ${e.field}` : ""}: {e.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
