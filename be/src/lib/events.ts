import type { Prisma } from "../generated/prisma/client.js";
import { redis } from "../config/redis.js";
import { logger } from "../config/logger.js";

export const REALTIME_CHANNEL = "certiflow:events";

export type DomainEventType =
  | "BATCH_CREATED"
  | "BATCH_UPDATED"
  | "BATCH_SUBMITTED"
  | "BATCH_DECISION"
  | "BATCH_APPROVED"
  | "BATCH_ESCALATED"
  | "CERTIFICATES_ISSUED"
  | "CERTIFICATE_DELIVERY"
  | "CERTIFICATE_REVOKED";

export interface DomainEvent {
  type: DomainEventType;
  batchId?: string;
  certificateId?: string;
  centreId?: string;
  districtId?: string;
  status?: string;
  requestId?: string;
}

/** Write an event to the outbox inside the caller's transaction (see OutboxEvent). */
export const emit = (tx: Prisma.TransactionClient, event: DomainEvent) =>
  tx.outboxEvent.create({ data: { type: event.type, payload: event as unknown as Prisma.InputJsonValue } });

/** Fire-and-forget UI notification for progress that needs no guaranteed delivery
 *  (e.g. "certificate 12/60 delivered"). Losing one only delays a screen refresh. */
export const publishRealtime = (event: DomainEvent) =>
  redis.publish(REALTIME_CHANNEL, JSON.stringify({ ...event, at: new Date().toISOString() })).catch((err) => {
    logger.debug({ err: err.message, type: event.type }, "realtime publish skipped");
  });
