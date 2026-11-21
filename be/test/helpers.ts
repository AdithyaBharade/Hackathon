import bcrypt from "bcryptjs";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/config/prisma.js";
import { redis } from "../src/config/redis.js";
import { deliveryQueue, issuanceQueue, maintenanceQueue } from "../src/jobs/queues/index.js";

export const PASSWORD = "Test@1234";

/** Wipe every table and queue so each test file starts from nothing. */
export async function resetAll() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE audit_events, outbox_events, notifications, certificates, decisions, candidates, batches, refresh_tokens, users, training_centres, districts CASCADE`
  );
  await waitForRedis();
  await redis.flushdb();
  await Promise.all([issuanceQueue, deliveryQueue, maintenanceQueue].map((q) => q.obliterate({ force: true }).catch(() => {})));
}

export async function waitForRedis() {
  for (let i = 0; i < 50 && redis.status !== "ready"; i++) await new Promise((r) => setTimeout(r, 100));
}

/** The demo cast, plus users outside Pune to prove isolation. */
export async function seedPeople() {
  const password = await bcrypt.hash(PASSWORD, 4);
  const pune = await prisma.district.create({ data: { code: "PUN", name: "Pune" } });
  const nashik = await prisma.district.create({ data: { code: "NSK", name: "Nashik" } });
  const centre = await prisma.trainingCentre.create({ data: { code: "C-PUN", name: "Pune Centre", districtId: pune.id } });
  const otherCentre = await prisma.trainingCentre.create({ data: { code: "C-NSK", name: "Nashik Centre", districtId: nashik.id } });
  const mk = (name: string, email: string, role: "CENTRE" | "DISTRICT_OFFICER" | "QUALITY" | "STATE", extra: object = {}) =>
    prisma.user.create({ data: { name, email, password, role, ...extra } });
  return {
    pune,
    nashik,
    centre,
    otherCentre,
    anika: await mk("Anika Rao", "anika@t.test", "CENTRE", { centreId: centre.id, districtId: pune.id }),
    dev: await mk("Dev Malhotra", "dev@t.test", "DISTRICT_OFFICER", { districtId: pune.id }),
    meera: await mk("Meera Iyer", "meera@t.test", "DISTRICT_OFFICER", { districtId: pune.id }),
    kabir: await mk("Kabir Shah", "kabir@t.test", "DISTRICT_OFFICER", { districtId: pune.id }),
    neha: await mk("Neha Kapoor", "neha@t.test", "QUALITY"),
    farah: await mk("Farah Khan", "farah@t.test", "STATE"),
    sameer: await mk("Sameer Wagh", "sameer@t.test", "DISTRICT_OFFICER", { districtId: nashik.id }),
    ira: await mk("Ira Nair", "ira@t.test", "CENTRE", { centreId: otherCentre.id, districtId: nashik.id }),
  };
}

/** A logged-in browser session (cookies kept by the agent). */
export async function loginAs(email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export type Agent = Awaited<ReturnType<typeof loginAs>>;

let mobileCounter = 0;
export const csvFor = (n: number) => {
  const rows = Array.from({ length: n }, (_, i) => {
    mobileCounter++;
    return `Candidate ${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + ((i / 26) | 0))},${9000000000 + mobileCounter * 7},15/06/2002,A`;
  });
  return Buffer.from(`Name,Mobile,Date of Birth,Grade\n${rows.join("\n")}\n`);
};

/** Centre creates a batch, uploads n candidates and submits it. */
export async function submittedBatch(centre: Agent, n = 5) {
  const created = await centre.post("/api/batches").send({ courseName: "Electrician", trainingEndDate: "2026-11-01" });
  if (created.status !== 201) throw new Error(JSON.stringify(created.body));
  const id = created.body.data.id as string;
  const up = await centre.post(`/api/batches/${id}/candidates`).attach("file", csvFor(n), "batch.csv");
  if (up.status !== 200) throw new Error(JSON.stringify(up.body));
  const sub = await centre.post(`/api/batches/${id}/submit`);
  if (sub.status !== 200) throw new Error(JSON.stringify(sub.body));
  return { id, version: sub.body.data.version as number };
}

export const approve = (agent: Agent, id: string, version: number) =>
  agent.post(`/api/batches/${id}/decisions`).send({ action: "APPROVE", version });

export const batchRow = (id: string) => prisma.batch.findUniqueOrThrow({ where: { id } });

export async function until<T>(fn: () => Promise<T>, ok: (v: T) => boolean, timeoutMs = 30_000, stepMs = 100): Promise<T> {
  const end = Date.now() + timeoutMs;
  let last: T;
  do {
    last = await fn();
    if (ok(last)) return last;
    await new Promise((r) => setTimeout(r, stepMs));
  } while (Date.now() < end);
  throw new Error(`condition not met in ${timeoutMs}ms; last value: ${JSON.stringify(last)}`);
}
