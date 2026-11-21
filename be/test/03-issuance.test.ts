/**
 * Moment 3: a batch of 60 is approved; every candidate ends up with exactly one
 * certificate on their phone, although WhatsApp fails and times out.
 * Never: two certificates for one candidate, or two certificates sharing a number.
 */
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { createWhatsAppMock } from "../src/mock/whatsapp-provider.js";
import { startOutboxRelay } from "../src/jobs/outbox-relay.js";
import { startDeliveryWorker, startIssuanceWorker } from "../src/jobs/workers/index.js";
import { certificateService } from "../src/services/certificate.service.js";
import { approve, batchRow, loginAs, resetAll, seedPeople, submittedBatch, until, type Agent } from "./helpers.js";

// 30% hard failures, 20% "delivered but the reply never arrived" (worse than a failure)
const mock = createWhatsAppMock({ failRate: 0.3, timeoutRate: 0.2, hangMs: 400 });
let server: Server;
let stop: (() => Promise<unknown>)[] = [];
let anika: Agent, dev: Agent, meera: Agent, neha: Agent, farah: Agent;

beforeAll(async () => {
  await resetAll();
  await seedPeople();
  server = await mock.listen(8199);
  [anika, dev, meera, neha, farah] = await Promise.all(["anika", "dev", "meera", "neha", "farah"].map((n) => loginAs(`${n}@t.test`)));
});

afterAll(async () => {
  await Promise.all(stop.map((s) => s()));
  server?.close();
});

/** Run two copies of every worker, as two instances would in production. */
function startWorkers() {
  const ws = [startIssuanceWorker(), startIssuanceWorker(), startDeliveryWorker(), startDeliveryWorker()];
  const relays = [startOutboxRelay(50), startOutboxRelay(50)];
  stop = [...ws.map((w) => () => w.close()), ...relays.map((r) => () => r.close())];
}

describe("certificate issuance and delivery", () => {
  it("gives each of 60 candidates exactly one certificate on their phone", async () => {
    const { id, version } = await submittedBatch(anika, 60);
    await approve(dev, id, version);
    await approve(meera, id, version);
    await approve(neha, id, version); // 60 > 50: quality review
    const final = await approve(farah, id, version);
    expect(final.body.data.status).toBe("APPROVED");

    startWorkers();

    const certs = await until(
      () => prisma.certificate.findMany({ where: { batchId: id }, include: { candidate: true } }),
      (cs) => cs.length === 60 && cs.every((c) => c.deliveryStatus === "SENT"),
      45_000,
      200
    );

    // One certificate per candidate, numbers all distinct
    expect(new Set(certs.map((c) => c.candidateId)).size).toBe(60);
    expect(new Set(certs.map((c) => c.number)).size).toBe(60);

    // What actually reached phones: exactly one message per candidate
    const delivered = mock.inbox.filter((m) => certs.some((c) => c.id === m.idempotencyKey));
    expect(delivered).toHaveLength(60);
    expect(new Set(delivered.map((m) => m.to)).size).toBe(60);

    // The provider really did misbehave, and retries happened
    expect(mock.stats.failed).toBeGreaterThan(0);
    expect(mock.stats.timedOut).toBeGreaterThan(0);
    expect(certs.some((c) => c.deliveryAttempts > 1)).toBe(true);
    expect((await batchRow(id)).status).toBe("APPROVED");
  });

  it("is idempotent: re-running issuance concurrently creates nothing new", async () => {
    const batch = await prisma.batch.findFirstOrThrow({ where: { status: "APPROVED" } });
    const before = await prisma.certificate.count({ where: { batchId: batch.id } });
    const results = await Promise.all([1, 2, 3, 4].map(() => certificateService.issueForBatch(batch.id)));
    expect(results.every((r) => r.created === 0)).toBe(true);
    expect(await prisma.certificate.count({ where: { batchId: batch.id } })).toBe(before);
  });

  it("enforces one certificate per candidate in the database itself", async () => {
    const cert = await prisma.certificate.findFirstOrThrow();
    await expect(prisma.certificate.create({ data: { candidateId: cert.candidateId, batchId: cert.batchId } })).rejects.toThrow();
    await expect(
      prisma.$executeRawUnsafe(`UPDATE certificates SET number = (SELECT number FROM certificates WHERE id <> '${cert.id}' LIMIT 1) WHERE id = '${cert.id}'`)
    ).rejects.toThrow();
  });

  it("marks delivery FAILED after the provider stays down, and a resend recovers it", async () => {
    // Fresh 3-candidate batch while WhatsApp is completely down
    const { id, version } = await submittedBatch(anika, 3);
    await approve(dev, id, version);
    await approve(meera, id, version);
    mock.opts.outage = true;
    await approve(farah, id, version);

    const failed = await until(
      () => prisma.certificate.findMany({ where: { batchId: id } }),
      (cs) => cs.length === 3 && cs.every((c) => c.deliveryStatus === "FAILED"),
      45_000,
      200
    );
    expect(await prisma.notification.count({ where: { type: "DELIVERY_FAILED", batchId: id } })).toBe(3);

    mock.opts.outage = false;
    mock.opts.failRate = 0;
    mock.opts.timeoutRate = 0;
    for (const c of failed) expect((await farah.post(`/api/certificates/${c.id}/resend`)).status).toBe(200);
    await until(
      () => prisma.certificate.findMany({ where: { batchId: id } }),
      (cs) => cs.every((c) => c.deliveryStatus === "SENT"),
      20_000,
      200
    );
    expect(mock.inbox.filter((m) => failed.some((c) => c.id === m.idempotencyKey))).toHaveLength(3);
  });
});
