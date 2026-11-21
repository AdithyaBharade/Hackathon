import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { audit } from "../lib/audit.js";
import { emit } from "../lib/events.js";
import { PENDING_STATUSES } from "../domain/workflow.js";

/**
 * Find batches waiting at a stage longer than the SLA and escalate each once:
 * a notification for the state office, an audit entry and a realtime event.
 * The conditional update (escalatedAt IS NULL) makes it safe when several workers
 * run the check at the same moment. escalatedAt is cleared whenever the batch moves,
 * so a batch that gets stuck again at the next stage is escalated again.
 */
export async function escalateStuckBatches(now = new Date()) {
  const cutoff = new Date(now.getTime() - env.STUCK_AFTER_MINUTES * 60_000);
  const candidates = await prisma.batch.findMany({
    where: { status: { in: PENDING_STATUSES }, escalatedAt: null, stageEnteredAt: { lt: cutoff } },
    select: { id: true, code: true, status: true, centreId: true, districtId: true, stageEnteredAt: true },
    take: 200,
  });

  let escalated = 0;
  for (const b of candidates) {
    const done = await prisma.$transaction(async (tx) => {
      const { count } = await tx.batch.updateMany({ where: { id: b.id, status: b.status, escalatedAt: null }, data: { escalatedAt: now } });
      if (count === 0) return false; // another worker got there first, or it just moved
      const waitingMin = Math.round((now.getTime() - b.stageEnteredAt!.getTime()) / 60_000);
      const message = `Batch ${b.code} has been waiting at ${b.status.replace("PENDING_", "").toLowerCase()} review for ${waitingMin} min`;
      await tx.notification.create({ data: { role: "STATE", batchId: b.id, type: "BATCH_STUCK", message } });
      if (b.status === "PENDING_DISTRICT")
        await tx.notification.create({ data: { role: "DISTRICT_OFFICER", districtId: b.districtId, batchId: b.id, type: "BATCH_STUCK", message } });
      await audit(tx, null, { entityType: "BATCH", entityId: b.id, batchId: b.id, action: "ESCALATED", data: { stage: b.status, waitingMin } });
      await emit(tx, { type: "BATCH_ESCALATED", batchId: b.id, centreId: b.centreId, districtId: b.districtId, status: b.status });
      return true;
    });
    if (done) escalated++;
  }
  if (escalated) logger.info({ escalated }, "stuck batches escalated");
  return escalated;
}
