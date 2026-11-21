/**
 * Outbox relay: moves events committed in the database onto the queue / realtime bus.
 *
 * Why: if the API enqueued "batch approved" directly after committing, a crash or a
 * Redis blip between the two would lose the event and the candidates would never get
 * their certificates. Here the event is a row written in the same transaction as the
 * approval. Any number of relays can run: FOR UPDATE SKIP LOCKED hands each row to one.
 * If enqueueing fails the transaction rolls back and the row is retried next tick.
 */
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { publishRealtime, type DomainEvent } from "../lib/events.js";
import { enqueueIssuance } from "./queues/index.js";

const BATCH_SIZE = 100;

async function dispatch(event: DomainEvent) {
  if (event.type === "BATCH_APPROVED" && event.batchId) await enqueueIssuance({ batchId: event.batchId, requestId: event.requestId });
  await publishRealtime(event);
}

/** Relay one batch of pending events. Returns how many were published. */
export async function relayOnce(): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; payload: DomainEvent }[]>`
      SELECT id, payload FROM outbox_events
      WHERE "publishedAt" IS NULL
      ORDER BY "createdAt"
      LIMIT ${BATCH_SIZE}
      FOR UPDATE SKIP LOCKED`;
    for (const row of rows) await dispatch(row.payload);
    if (rows.length)
      await tx.outboxEvent.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { publishedAt: new Date() } });
    return rows.length;
  });
}

export function startOutboxRelay(intervalMs = 500) {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  const tick = async () => {
    if (stopped) return;
    let n = 0;
    try {
      n = await relayOnce();
    } catch (err) {
      logger.warn({ err: (err as Error).message }, "outbox relay failed, will retry");
    }
    // Drain quickly when there is a backlog, otherwise poll gently
    timer = setTimeout(tick, n === BATCH_SIZE ? 0 : intervalMs);
  };
  tick();
  return {
    close: async () => {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
