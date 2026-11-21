import type { Prisma } from "../generated/prisma/client.js";
import type { ActionContext } from "./context.js";

type Tx = Prisma.TransactionClient;

export interface AuditEntry {
  entityType: "BATCH" | "CERTIFICATE";
  entityId: string;
  batchId?: string;
  action: string;
  data?: Prisma.InputJsonValue;
}

/** Append to the audit trail inside the caller's transaction, so a state change
 *  and its record either both exist or neither does. */
export const audit = (tx: Tx, ctx: Partial<ActionContext> | null, e: AuditEntry) =>
  tx.auditEvent.create({
    data: {
      ...e,
      actorId: ctx?.user?.sub ?? null,
      actorRole: ctx?.user?.role ?? "SYSTEM",
      requestId: ctx?.requestId ?? null,
    },
  });
