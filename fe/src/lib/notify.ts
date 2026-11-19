import { toast } from "@/components/ui/toast";

/** Single place for user feedback toasts. Use these instead of calling toast directly. */
export const notify = {
  success: (title: string, description?: string) => toast.add({ title, description, type: "success" }),
  error: (title: string, description?: string) => toast.add({ title, description, type: "error" }),
  info: (title: string, description?: string) => toast.add({ title, description, type: "info" }),
};
