/**
 * Moment 2: two officers approve at the same moment -> the batch moves once.
 * Never: acting at a step that isn't yours, acting as someone else, double-counting.
 */
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { approve, batchRow, loginAs, resetAll, seedPeople, submittedBatch, type Agent } from "./helpers.js";

let people: Awaited<ReturnType<typeof seedPeople>>;
let anika: Agent, dev: Agent, meera: Agent, kabir: Agent, neha: Agent, farah: Agent, sameer: Agent;

beforeAll(async () => {
  await resetAll();
  people = await seedPeople();
  [anika, dev, meera, kabir, neha, farah, sameer] = await Promise.all(
    ["anika", "dev", "meera", "kabir", "neha", "farah", "sameer"].map((n) => loginAs(`${n}@t.test`))
  );
});

describe("concurrent district approvals", () => {
  it("advances the batch exactly once when two officers approve simultaneously", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    const [a, b] = await Promise.all([approve(dev, id, version), approve(meera, id, version)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    // Exactly one of the two decisions moved the stage
    expect([a.body.data.moved, b.body.data.moved].filter(Boolean)).toHaveLength(1);
    expect((await batchRow(id)).status).toBe("PENDING_STATE");
    const transitions = await prisma.auditEvent.count({ where: { batchId: id, action: "STATUS_CHANGED" } });
    expect(transitions).toBe(1);
  });

  it("stays correct when three officers race for a quorum of two", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    const results = await Promise.all([approve(dev, id, version), approve(meera, id, version), approve(kabir, id, version)]);
    const ok = results.filter((r) => r.status === 200);
    const late = results.filter((r) => r.status === 409);
    expect(ok).toHaveLength(2);
    expect(late).toHaveLength(1); // the stage had already moved on
    expect((await batchRow(id)).status).toBe("PENDING_STATE");
    expect(await prisma.auditEvent.count({ where: { batchId: id, action: "STATUS_CHANGED" } })).toBe(1);
  });

  it("does not let one officer count twice, even with parallel requests", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    const results = await Promise.all([approve(dev, id, version), approve(dev, id, version), approve(dev, id, version)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    expect((await batchRow(id)).status).toBe("PENDING_DISTRICT");
    expect(await prisma.decision.count({ where: { batchId: id } })).toBe(1);
  });

  it("lets an officer withdraw a mistaken approval while the stage is open", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    await approve(dev, id, version);
    expect((await dev.post(`/api/batches/${id}/decisions/retract`)).status).toBe(200);
    await approve(meera, id, version);
    expect((await batchRow(id)).status).toBe("PENDING_DISTRICT"); // Dev's withdrawn vote no longer counts
    await approve(kabir, id, version);
    expect((await batchRow(id)).status).toBe("PENDING_STATE");
  });
});

describe("only the right person acts at each step", () => {
  it("blocks the centre, quality and state from deciding at the district stage", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    expect((await approve(anika, id, version)).status).toBe(403);
    expect((await approve(neha, id, version)).status).toBe(403);
    expect((await approve(farah, id, version)).status).toBe(403);
    expect((await batchRow(id)).status).toBe("PENDING_DISTRICT");
  });

  it("hides a batch from an officer of another district", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    expect((await sameer.get(`/api/batches/${id}`)).status).toBe(404);
    expect((await approve(sameer, id, version)).status).toBe(404);
    const list = await sameer.get("/api/batches");
    expect(list.body.data.items.map((b: { id: string }) => b.id)).not.toContain(id);
  });

  it("blocks district officers from the state stage", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    await approve(dev, id, version);
    await approve(meera, id, version);
    expect((await approve(kabir, id, version)).status).toBe(409); // not at district stage anymore
    expect((await batchRow(id)).status).toBe("PENDING_STATE");
    expect((await approve(farah, id, version)).status).toBe(200);
    expect((await batchRow(id)).status).toBe("APPROVED");
  });

  it("sends big batches through the quality team", async () => {
    const { id, version } = await submittedBatch(anika, 51);
    await approve(dev, id, version);
    await approve(meera, id, version);
    expect((await batchRow(id)).status).toBe("PENDING_QUALITY");
    expect((await approve(farah, id, version)).status).toBe(403);
    expect((await approve(neha, id, version)).status).toBe(200);
    expect((await batchRow(id)).status).toBe("PENDING_STATE");
  });

  it("records the decision under the logged-in officer, whatever the body claims", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    await dev.post(`/api/batches/${id}/decisions`).send({ action: "APPROVE", version, actorId: people.meera.id });
    const decisions = await prisma.decision.findMany({ where: { batchId: id } });
    expect(decisions.map((d) => d.actorId)).toEqual([people.dev.id]);
    const auditRow = await prisma.auditEvent.findFirstOrThrow({ where: { batchId: id, action: "DECISION_APPROVE" } });
    expect(auditRow.actorId).toBe(people.dev.id);
    expect(auditRow.createdAt).toBeInstanceOf(Date);
  });

  it("rejects a tampered or forged token", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    // Anika forges a STATE token with a guessed secret
    const forged = jwt.sign({ sub: people.anika.id, role: "STATE", districtId: null, centreId: null }, "not-the-secret");
    const res = await request(app).post(`/api/batches/${id}/decisions`).set("authorization", `Bearer ${forged}`).send({ action: "APPROVE", version });
    expect(res.status).toBe(401);
    // An unsigned "alg: none" token
    const none = jwt.sign({ sub: people.farah.id, role: "STATE" }, "", { algorithm: "none" });
    expect((await request(app).get("/api/batches").set("authorization", `Bearer ${none}`)).status).toBe(401);
    expect((await request(app).get("/api/batches")).status).toBe(401);
  });

  it("refuses an approval for a version the officer never saw", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    expect((await approve(dev, id, version + 1)).status).toBe(409);
  });

  it("requires a reason to reject or send back", async () => {
    const { id, version } = await submittedBatch(anika, 5);
    const res = await dev.post(`/api/batches/${id}/decisions`).send({ action: "REJECT", version });
    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe("reason");
  });
});
