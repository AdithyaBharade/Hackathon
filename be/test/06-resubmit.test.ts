/**
 * Moment 6: an officer sends a batch back; the centre fixes and resends it.
 * Decision (documented in README): approvals belong to a version of the batch.
 * A resubmission is a new version, so earlier approvals no longer count and the
 * batch restarts at district review. The old decisions stay on record.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { approve, batchRow, csvFor, loginAs, resetAll, seedPeople, type Agent } from "./helpers.js";

let anika: Agent, dev: Agent, meera: Agent, kabir: Agent, farah: Agent;

beforeAll(async () => {
  await resetAll();
  await seedPeople();
  [anika, dev, meera, kabir, farah] = await Promise.all(["anika", "dev", "meera", "kabir", "farah"].map((n) => loginAs(`${n}@t.test`)));
});

describe("send back and resubmit", () => {
  it("resets approvals on resubmission and keeps the history", async () => {
    const created = await anika.post("/api/batches").send({ courseName: "Plumbing", trainingEndDate: "2026-10-01" });
    const id = created.body.data.id;
    await anika.post(`/api/batches/${id}/candidates`).attach("file", csvFor(4), "v1.csv");
    const v1 = (await anika.post(`/api/batches/${id}/submit`)).body.data.version;
    expect(v1).toBe(1);

    await approve(dev, id, v1);
    await approve(meera, id, v1); // district done
    const back = await farah.post(`/api/batches/${id}/decisions`).send({ action: "SEND_BACK", version: v1, reason: "Two candidates have the wrong grade" });
    expect(back.status).toBe(200);
    const sentBack = await batchRow(id);
    expect(sentBack.status).toBe("SENT_BACK");
    expect(sentBack.lastReason).toBe("Two candidates have the wrong grade");

    // Centre sees it waiting for them with the reason
    const inbox = await anika.get("/api/batches?inbox=true");
    expect(inbox.body.data.items.map((b: { id: string }) => b.id)).toContain(id);

    // Fix and resend
    expect((await anika.post(`/api/batches/${id}/candidates`).attach("file", csvFor(4), "v2.csv")).status).toBe(200);
    const v2 = (await anika.post(`/api/batches/${id}/submit`)).body.data.version;
    expect(v2).toBe(2);
    const resubmitted = await batchRow(id);
    expect(resubmitted.status).toBe("PENDING_DISTRICT");

    // The v1 approvals don't carry over
    const detail = await dev.get(`/api/batches/${id}`);
    expect(detail.body.data.workflow).toMatchObject({ stage: "DISTRICT", currentApprovals: 0, requiredApprovals: 2, myDecision: null });
    expect((await dev.get("/api/batches?inbox=true")).body.data.items.map((b: { id: string }) => b.id)).toContain(id);

    // An approval for the old version is refused
    expect((await approve(dev, id, v1)).status).toBe(409);

    await approve(dev, id, v2);
    expect((await batchRow(id)).status).toBe("PENDING_DISTRICT");
    await approve(kabir, id, v2);
    expect((await batchRow(id)).status).toBe("PENDING_STATE");

    // Full history retained
    const decisions = await prisma.decision.findMany({ where: { batchId: id }, orderBy: { createdAt: "asc" } });
    expect(decisions.map((d) => `${d.batchVersion}:${d.stage}:${d.action}`)).toEqual([
      "1:DISTRICT:APPROVE",
      "1:DISTRICT:APPROVE",
      "1:STATE:SEND_BACK",
      "2:DISTRICT:APPROVE",
      "2:DISTRICT:APPROVE",
    ]);
    const timeline = await anika.get(`/api/batches/${id}/timeline`);
    expect(timeline.body.data.map((e: { action: string }) => e.action)).toEqual(expect.arrayContaining(["SUBMITTED", "DECISION_SEND_BACK", "RESUBMITTED"]));
  });

  it("makes a rejection final", async () => {
    const created = await anika.post("/api/batches").send({ courseName: "Masonry", trainingEndDate: "2026-10-01" });
    const id = created.body.data.id;
    await anika.post(`/api/batches/${id}/candidates`).attach("file", csvFor(2), "x.csv");
    const v = (await anika.post(`/api/batches/${id}/submit`)).body.data.version;
    await dev.post(`/api/batches/${id}/decisions`).send({ action: "REJECT", version: v, reason: "This centre is not accredited for masonry" });
    expect((await batchRow(id)).status).toBe("REJECTED");
    expect((await anika.post(`/api/batches/${id}/submit`)).status).toBe(409);
    expect((await anika.post(`/api/batches/${id}/candidates`).attach("file", csvFor(2), "x.csv")).status).toBe(409);
  });
});
