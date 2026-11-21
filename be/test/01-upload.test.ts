/** Moment 1: a spreadsheet with a few bad rows -> exact problems, nothing half-saved. */
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/prisma.js";
import { csvFor, loginAs, resetAll, seedPeople, type Agent } from "./helpers.js";

let anika: Agent;
let batchId: string;

beforeAll(async () => {
  await resetAll();
  await seedPeople();
  anika = await loginAs("anika@t.test");
  const res = await anika.post("/api/batches").send({ courseName: "Electrician", trainingEndDate: "2026-11-01" });
  batchId = res.body.data.id;
});

describe("candidate upload", () => {
  it("reports every bad row with the row number and field, and saves nothing", async () => {
    const res = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", readFileSync("samples/candidates-with-errors.csv"), "with-errors.csv");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/4 row\(s\) have problems\. Nothing was saved/);
    const problems = res.body.errors.map((e: { row: number; field: string }) => `${e.row}:${e.field}`);
    expect(problems).toEqual(expect.arrayContaining(["4:mobile", "6:dateOfBirth", "8:name", "8:grade", "10:mobile"]));
    expect(await prisma.candidate.count({ where: { batchId } })).toBe(0);
  });

  it("keeps the previous good upload untouched when a later upload is bad", async () => {
    const good = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", readFileSync("samples/candidates-valid-12.csv"), "ok.csv");
    expect(good.status).toBe(200);
    expect(good.body.data.candidateCount).toBe(12);

    const bad = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", readFileSync("samples/candidates-with-errors.csv"), "bad.csv");
    expect(bad.status).toBe(400);
    expect(await prisma.candidate.count({ where: { batchId } })).toBe(12);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: batchId } })).candidateCount).toBe(12);
  });

  it("rejects a file with missing columns, an empty file and a non-spreadsheet", async () => {
    const missing = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", Buffer.from("Name,Phone\nA B,9876543210\n"), "x.csv");
    expect(missing.status).toBe(400);
    expect(missing.body.message).toMatch(/Missing column/);

    const empty = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", Buffer.from("Name,Mobile,DOB,Grade\n"), "x.csv");
    expect(empty.status).toBe(400);

    const exe = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", Buffer.from("MZ..."), "evil.exe");
    expect(exe.status).toBe(400);
  });

  it("does not let a centre upload into a batch it doesn't own", async () => {
    const ira = await loginAs("ira@t.test");
    const res = await ira.post(`/api/batches/${batchId}/candidates`).attach("file", csvFor(3), "x.csv");
    expect(res.status).toBe(404);
  });

  it("locks the candidate list once the batch is submitted", async () => {
    expect((await anika.post(`/api/batches/${batchId}/submit`)).status).toBe(200);
    const res = await anika.post(`/api/batches/${batchId}/candidates`).attach("file", csvFor(3), "x.csv");
    expect(res.status).toBe(409);
    expect(await prisma.candidate.count({ where: { batchId } })).toBe(12);
  });
});
