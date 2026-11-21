/**
 * The approval workflow as pure functions, so the rules live in one place and
 * can be unit-tested without a database.
 *
 *   DRAFT ──submit──▶ PENDING_DISTRICT ──quorum──▶ [PENDING_QUALITY if big] ──▶ PENDING_STATE ──▶ APPROVED
 *                          │                              │                         │
 *                          └──── SEND_BACK ──▶ SENT_BACK ─┴── (centre fixes, resubmits: version + 1)
 *                          └──── REJECT ────▶ REJECTED (terminal)
 */
import { env } from "../config/env.js";
import type { BatchStatus, Role, Stage } from "../generated/prisma/client.js";

export const PENDING_STATUSES: BatchStatus[] = ["PENDING_DISTRICT", "PENDING_QUALITY", "PENDING_STATE"];

export const stageOf = (status: BatchStatus): Stage | null =>
  status === "PENDING_DISTRICT"
    ? "DISTRICT"
    : status === "PENDING_QUALITY"
      ? "QUALITY"
      : status === "PENDING_STATE"
        ? "STATE"
        : null;

/** Which role acts at which stage. Nobody else may decide there. */
export const roleForStage: Record<Stage, Role> = {
  DISTRICT: "DISTRICT_OFFICER",
  QUALITY: "QUALITY",
  STATE: "STATE",
};

export const requiredApprovals = (stage: Stage) => (stage === "DISTRICT" ? env.DISTRICT_QUORUM : 1);

export const isBigBatch = (candidateCount: number) => candidateCount > env.BIG_BATCH_THRESHOLD;

/** Status after a stage reaches its approval quorum. */
export const statusAfterApproval = (stage: Stage, candidateCount: number): BatchStatus => {
  if (stage === "DISTRICT") return isBigBatch(candidateCount) ? "PENDING_QUALITY" : "PENDING_STATE";
  if (stage === "QUALITY") return "PENDING_STATE";
  return "APPROVED";
};

/** Centre may edit candidates and (re)submit only in these states. */
export const EDITABLE_STATUSES: BatchStatus[] = ["DRAFT", "SENT_BACK"];

export const STAGE_ORDER: Stage[] = ["DISTRICT", "QUALITY", "STATE"];

/** The stage a reviewer role acts at (CENTRE has none; it sorts before every stage). */
export const stageForRole = (role: Role): Stage | "NONE" =>
  role === "DISTRICT_OFFICER" ? "DISTRICT" : role === "QUALITY" ? "QUALITY" : role === "STATE" ? "STATE" : "NONE";
