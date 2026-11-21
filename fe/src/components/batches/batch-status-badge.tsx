import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type BatchStatus } from "@/types/batch";

const VARIANT: Record<BatchStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "outline",
  PENDING_DISTRICT: "secondary",
  PENDING_QUALITY: "secondary",
  PENDING_STATE: "secondary",
  SENT_BACK: "outline",
  REJECTED: "destructive",
  APPROVED: "default",
};

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function DeliveryBadge({ status }: { status: "PENDING" | "SENT" | "FAILED" }) {
  const variant = status === "SENT" ? "default" : status === "FAILED" ? "destructive" : "outline";
  const label = status === "SENT" ? "On WhatsApp" : status === "FAILED" ? "Delivery failed" : "Sending...";
  return <Badge variant={variant}>{label}</Badge>;
}
