/** Moment 5: a batch sits untouched too long; someone senior finds out without chasing. */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { escalateStuckBatches } from "../src/services/escalation.service.js";
import { approve, batchRow, loginAs, resetAll, seedPeople, submittedBatch, type Agent } from "./helpers.js";

let anika: Agent, dev: Agent, meera: Agent, farah: Agent;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

beforeAll(async () => {
  await resetAll();
  await seedPeople();
  [anika, dev, meera, farah] = await Promise.all(["anika", "dev", "meera", "farah"].map((n) => loginAs(`${n}@t.test`)));
});

describe("stuck batch escalation", () => {
  it("escalates a batch past the SLA once, notifies the state office, and leaves fresh batches alone", async () => {
    const stuck = await submittedBatch(anika, 3);
    const fresh = await submittedBatch(anika, 3);
    await prisma.batch.update({ where: { id: stuck.id }, data: { stageEnteredAt: hoursAgo(3) } }); // SLA in tests: 60 min

    // Several workers running the check at once must not escalate twice
    const counts = await Promise.all([escalateStuckBatches(), escalateStuckBatches(), escalateStuckBatches()]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
    expect(await escalateStuckBatches()).toBe(0);

    expect((await batchRow(stuck.id)).escalatedAt).not.toBeNull();
    expect((await batchRow(fresh.id)).escalatedAt).toBeNull();

    const notes = await farah.get("/api/notifications");
    expect(notes.body.data.filter((n: { batchId: string; type: string }) => n.batchId === stuck.id && n.type === "BATCH_STUCK")).toHaveLength(1);
    const stuckList = await farah.get("/api/batches/stuck");
    expect(stuckList.body.data.map((b: { id: string }) => b.id)).toEqual([stuck.id]);
    expect(await prisma.auditEvent.count({ where: { batchId: stuck.id, action: "ESCALATED" } })).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { type: "BATCH_ESCALATED" } })).toBe(1);
  });

  it("re-arms when the batch moves, so it can be escalated again at the next stage", async () => {
    const b = await submittedBatch(anika, 3);
    await prisma.batch.update({ where: { id: b.id }, data: { stageEnteredAt: hoursAgo(3) } });
    expect(await escalateStuckBatches()).toBe(1);
    await approve(dev, b.id, b.version);
    await approve(meera, b.id, b.version);
    const moved = await batchRow(b.id);
    expect(moved.status).toBe("PENDING_STATE");
    expect(moved.escalatedAt).toBeNull();
    await prisma.batch.update({ where: { id: b.id }, data: { stageEnteredAt: hoursAgo(3) } });
    expect(await escalateStuckBatches()).toBe(1);
  });

  it("is visible only to the state office", async () => {
    expect((await dev.get("/api/batches/stuck")).status).toBe(403);
    expect((await anika.get("/api/batches/stuck")).status).toBe(403);
  });
});
