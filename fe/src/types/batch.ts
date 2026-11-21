export type BatchStatus = "DRAFT" | "PENDING_DISTRICT" | "PENDING_QUALITY" | "PENDING_STATE" | "SENT_BACK" | "REJECTED" | "APPROVED";
export type Stage = "DISTRICT" | "QUALITY" | "STATE";
export type DecisionAction = "APPROVE" | "REJECT" | "SEND_BACK";
export type DeliveryStatus = "PENDING" | "SENT" | "FAILED";
export type CertificateStatus = "ISSUED" | "REVOKED";

export interface BatchSummary {
  id: string;
  code: string;
  courseName: string;
  trainingEndDate: string;
  status: BatchStatus;
  version: number;
  candidateCount: number;
  stageEnteredAt: string | null;
  escalatedAt: string | null;
  lastReason: string | null;
  createdAt: string;
  updatedAt: string;
  centre: { id: string; name: string; code: string };
  district: { id: string; name: string };
}

export interface Candidate {
  id: string;
  rowNumber: number;
  name: string;
  mobile: string;
  dateOfBirth: string;
  grade: string;
  certificate: { id: string; number: string; status: CertificateStatus; deliveryStatus: DeliveryStatus; deliveryAttempts: number } | null;
}

export interface Decision {
  id: string;
  batchVersion: number;
  stage: Stage;
  action: DecisionAction;
  reason: string | null;
  retractedAt: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string };
}

export interface BatchDetail extends BatchSummary {
  candidates: Candidate[];
  decisions: Decision[];
  workflow: {
    stage: Stage | null;
    currentApprovals: number;
    requiredApprovals: number;
    canAct: boolean;
    myDecision: Decision | null;
  };
}

export interface AuditEvent {
  id: string;
  action: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  requestId: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  batchId: string | null;
  createdAt: string;
}

export interface RowError {
  row: number;
  field: string | null;
  message: string;
}

export interface CertificateRow {
  id: string;
  number: string;
  status: CertificateStatus;
  deliveryStatus: DeliveryStatus;
  deliveryAttempts: number;
  lastDeliveryError: string | null;
  issuedAt: string;
  revokedAt: string | null;
  revokeReason: string | null;
  candidate: { name: string };
  batch: { id: string; code: string; courseName: string; centre: { name: string } };
}

export type VerifyResult =
  | { found: false; number: string }
  | {
      found: true;
      valid: boolean;
      status: CertificateStatus;
      number: string;
      holderName: string;
      course: string;
      grade: string;
      centre: string;
      district: string;
      issuedAt: string;
      revokedAt: string | null;
    };

export const STATUS_LABEL: Record<BatchStatus, string> = {
  DRAFT: "Draft",
  PENDING_DISTRICT: "District review",
  PENDING_QUALITY: "Quality review",
  PENDING_STATE: "State approval",
  SENT_BACK: "Sent back",
  REJECTED: "Rejected",
  APPROVED: "Approved",
};
