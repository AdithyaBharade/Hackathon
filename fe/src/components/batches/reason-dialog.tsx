import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { onInvalidSubmit } from "@/lib/form";
import { reasonSchema, type ReasonInput } from "@/schemas/batch.schema";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}

/** Collects the mandatory reason for "send back", "reject" and "revoke". */
export function ReasonDialog({ open, onOpenChange, title, description, confirmLabel, destructive, loading, onConfirm }: ReasonDialogProps) {
  const form = useForm<ReasonInput>({ resolver: zodResolver(reasonSchema), defaultValues: { reason: "" } });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) form.reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit((v) => onConfirm(v.reason), onInvalidSubmit)}>
          <FieldGroup>
            <Controller
              control={form.control}
              name="reason"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="reason">Reason</FieldLabel>
                  <Textarea id="reason" placeholder="Explain what is wrong, so it can be fixed" aria-invalid={fieldState.invalid} {...field} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button type="submit" variant={destructive ? "destructive" : "default"} className="w-full sm:w-auto" disabled={loading}>
              {loading ? "Please wait..." : confirmLabel}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
