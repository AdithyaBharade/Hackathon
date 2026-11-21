import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { FormInput } from "@/components/common/form-input";
import { onInvalidSubmit } from "@/lib/form";
import { createBatchSchema, type CreateBatchFormValues, type CreateBatchInput } from "@/schemas/batch.schema";
import { useCreateBatch } from "@/services/batches/batches.queries";

export function CreateBatchDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const create = useCreateBatch();
  const form = useForm<CreateBatchFormValues, unknown, CreateBatchInput>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: { courseName: "", trainingEndDate: "" },
  });

  const onSubmit = (values: CreateBatchInput) =>
    create.mutate(values, {
      onSuccess: (batch) => {
        setOpen(false);
        form.reset();
        navigate(`/batches/${batch.id}`);
      },
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full sm:w-auto" />}>
        <PlusIcon className="size-4" /> New batch
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New batch</DialogTitle>
          <DialogDescription>Create the batch, then upload its candidate spreadsheet.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)}>
          <FieldGroup>
            <FormInput control={form.control} name="courseName" label="Course" placeholder="e.g. Electrician (Domestic)" />
            <FormInput control={form.control} name="trainingEndDate" label="Training ended on" type="date" />
            <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>
              {create.isPending ? "Creating..." : "Create batch"}
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
