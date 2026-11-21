/**
 * Moment 4: the state office cancels a fake certificate; an employer checking a
 * minute later is told it is no longer valid.
 * Never: a cancelled certificate shows as genuine; a stranger gets someone's
 * certificate or personal details.
 */
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { redis } from "../src/config/redis.js";
import { certificateService } from "../src/services/certificate.service.js";
import { signCertificate } from "../src/lib/signing.js";
import { approve, loginAs, resetAll, seedPeople, submittedBatch, type Agent } from "./helpers.js";

let farah: Agent, dev: Agent, anika: Agent;
let cert: { id: string; number: string };
let mobile: string;
let name: string;

beforeAll(async () => {
  await resetAll();
  await seedPeople();
  [anika, dev, farah] = await Promise.all(["anika", "dev", "farah"].map((n) => loginAs(`${n}@t.test`)));
  const meera = await loginAs("meera@t.test");
  const { id, version } = await submittedBatch(anika, 2);
  await approve(dev, id, version);
  await approve(meera, id, version);
  await approve(farah, id, version);
  await certificateService.issueForBatch(id); // run issuance directly; delivery isn't under test here
  const c = await prisma.certificate.findFirstOrThrow({ where: { batchId: id }, include: { candidate: true } });
  cert = c;
  mobile = c.candidate.mobile;
  name = c.candidate.name;
});

const verify = (number: string) => request(app).get(`/api/public/verify/${number}`);

describe("public verification", () => {
  it("confirms a genuine certificate without login, showing only what an employer needs", async () => {
    const res = await verify(cert.number);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ found: true, valid: true, status: "ISSUED", number: cert.number, course: "Electrician" });
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(mobile);
    expect(body).not.toContain(name); // name is masked
    expect(res.body.data.holderName).toMatch(/\*/);
    expect(body).not.toMatch(/dateOfBirth|candidateId|"id"/);
  });

  it("reports REVOKED immediately after cancellation, even though the valid answer was cached", async () => {
    await verify(cert.number); // warm the cache
    expect(await redis.get(`verify:${cert.number}`)).toBeTruthy();

    const res = await farah.post(`/api/certificates/${cert.id}/revoke`).send({ reason: "Issued against forged attendance records" });
    expect(res.status).toBe(200);

    const after = await verify(cert.number);
    expect(after.body.data).toMatchObject({ found: true, valid: false, status: "REVOKED" });
    const trail = await prisma.auditEvent.findFirstOrThrow({ where: { entityId: cert.id, action: "REVOKED" } });
    expect(trail.actorRole).toBe("STATE");
  });

  it("cannot be revoked twice, or by anyone but the state office", async () => {
    expect((await farah.post(`/api/certificates/${cert.id}/revoke`).send({ reason: "again please" })).status).toBe(409);
    const other = await prisma.certificate.findFirstOrThrow({ where: { status: "ISSUED" } });
    expect((await dev.post(`/api/certificates/${other.id}/revoke`).send({ reason: "I am a district officer" })).status).toBe(403);
    expect((await anika.post(`/api/certificates/${other.id}/revoke`).send({ reason: "I am the centre" })).status).toBe(403);
  });

  it("says 'not found' for an unknown number and rejects malformed input", async () => {
    const res = await verify("PSM-2026-999999");
    expect(res.body.data).toEqual({ found: false, number: "PSM-2026-999999" });
    expect((await verify("'; DROP TABLE certificates;--")).status).toBe(400);
  });
});

describe("certificate download", () => {
  it("serves the PDF only with the signed link from the WhatsApp message", async () => {
    const other = await prisma.certificate.findFirstOrThrow({ where: { status: "ISSUED" } });
    const ok = await request(app).get(`/api/public/certificates/${other.number}/pdf?sig=${signCertificate(other.id)}`);
    expect(ok.status).toBe(200);
    expect(ok.headers["content-type"]).toBe("application/pdf");

    // Knowing the number (printed on the paper) is not enough
    const guessed = await request(app).get(`/api/public/certificates/${other.number}/pdf?sig=${signCertificate(cert.id)}`);
    expect(guessed.status).toBe(403);
  });

  it("stops serving a revoked certificate even with a valid link", async () => {
    const res = await request(app).get(`/api/public/certificates/${cert.number}/pdf?sig=${signCertificate(cert.id)}`);
    expect(res.status).toBe(410);
  });
});
