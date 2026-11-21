/**
 * Demo data. Idempotent: does nothing if the demo users already exist.
 * `npm run db:seed -- --reset` wipes CertiFlow data first.
 *
 * Every demo user's password is Demo@1234.
 */
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import type { BatchStatus, Prisma } from "../generated/prisma/client.js";

const PASSWORD = "Demo@1234";
const reset = process.argv.includes("--reset");

const firstNames = ["Aarav", "Priya", "Rohan", "Sneha", "Vikram", "Pooja", "Arjun", "Kavya", "Rahul", "Ananya", "Sahil", "Isha", "Karan", "Neel", "Riya", "Yash", "Tanvi", "Omkar", "Sakshi", "Aditya"];
const lastNames = ["Patil", "Deshmukh", "Kulkarni", "Jadhav", "Shinde", "Pawar", "More", "Joshi", "Gaikwad", "Chavan"];
const grades = ["A+", "A", "B+", "B", "C", "PASS"];

const candidateRows = (n: number, seed: number) =>
  Array.from({ length: n }, (_, i) => ({
    rowNumber: i + 2,
    name: `${firstNames[(i + seed) % firstNames.length]} ${lastNames[(i * 3 + seed) % lastNames.length]}`,
    mobile: `9${String(seed).padStart(3, "0")}${String(100000 + i).slice(-6)}`,
    dateOfBirth: new Date(Date.UTC(2000 + (i % 6), i % 12, 1 + (i % 27))),
    grade: grades[i % grades.length]!,
  }));

async function main() {
  if (reset) {
    logger.info("Resetting CertiFlow data");
    await prisma.$transaction([
      prisma.auditEvent.deleteMany(),
      prisma.outboxEvent.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.certificate.deleteMany(),
      prisma.decision.deleteMany(),
      prisma.candidate.deleteMany(),
      prisma.batch.deleteMany(),
      prisma.refreshToken.deleteMany(),
      prisma.user.deleteMany(),
      prisma.trainingCentre.deleteMany(),
      prisma.district.deleteMany(),
    ]);
  } else if (await prisma.user.findUnique({ where: { email: "anika@centre.demo" } })) {
    logger.info("Demo data already present - skipping seed (use --reset to recreate)");
    return;
  }

  const password = await bcrypt.hash(PASSWORD, 10);
  const pune = await prisma.district.create({ data: { code: "PUN", name: "Pune" } });
  const nashik = await prisma.district.create({ data: { code: "NSK", name: "Nashik" } });
  const centre = await prisma.trainingCentre.create({ data: { code: "PSC-PUN-01", name: "Pragati Skill Centre, Hadapsar", districtId: pune.id } });
  const nashikCentre = await prisma.trainingCentre.create({ data: { code: "PSC-NSK-01", name: "Pragati Skill Centre, Nashik Road", districtId: nashik.id } });

  const user = (name: string, email: string, role: Prisma.UserCreateInput["role"], extra: Partial<Prisma.UserUncheckedCreateInput> = {}) =>
    prisma.user.create({ data: { name, email, password, role, ...extra } });

  const anika = await user("Anika Rao", "anika@centre.demo", "CENTRE", { centreId: centre.id, districtId: pune.id });
  const dev = await user("Dev Malhotra", "dev@district.demo", "DISTRICT_OFFICER", { districtId: pune.id });
  const meera = await user("Meera Iyer", "meera@district.demo", "DISTRICT_OFFICER", { districtId: pune.id });
  await user("Kabir Shah", "kabir@district.demo", "DISTRICT_OFFICER", { districtId: pune.id });
  await user("Neha Kapoor", "neha@quality.demo", "QUALITY");
  const farah = await user("Farah Khan", "farah@state.demo", "STATE");
  // Out-of-scope users, to show district and centre isolation
  await user("Sameer Wagh", "sameer@nashik.demo", "DISTRICT_OFFICER", { districtId: nashik.id });
  await user("Ira Nair", "ira@nashikcentre.demo", "CENTRE", { centreId: nashikCentre.id, districtId: nashik.id });

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);

  const makeBatch = async (
    code: string,
    courseName: string,
    status: BatchStatus,
    count: number,
    seed: number,
    opts: { version?: number; stageEnteredAt?: Date; decisions?: { actorId: string; stage: "DISTRICT" | "QUALITY" | "STATE" }[]; lastReason?: string } = {}
  ) => {
    const batch = await prisma.batch.create({
      data: {
        code,
        courseName,
        trainingEndDate: new Date(Date.UTC(2026, 10, 10)),
        centreId: centre.id,
        districtId: pune.id,
        status,
        version: opts.version ?? (status === "DRAFT" ? 0 : 1),
        candidateCount: count,
        stageEnteredAt: opts.stageEnteredAt ?? (status === "DRAFT" ? null : hoursAgo(1)),
        lastReason: opts.lastReason,
        createdById: anika.id,
        candidates: { create: candidateRows(count, seed) },
      },
    });
    for (const d of opts.decisions ?? [])
      await prisma.decision.create({ data: { batchId: batch.id, batchVersion: batch.version, stage: d.stage, action: "APPROVE", actorId: d.actorId } });
    await prisma.auditEvent.create({ data: { entityType: "BATCH", entityId: batch.id, batchId: batch.id, action: "SEEDED", actorRole: "SYSTEM", data: { status } } });
    return batch;
  };

  await makeBatch("PSC-PUN-01-DEMO-DRAFT", "Retail Sales Associate", "DRAFT", 0, 1);
  await makeBatch("PSC-PUN-01-DEMO-REVIEW", "Electrician (Domestic)", "PENDING_DISTRICT", 12, 2);
  await makeBatch("PSC-PUN-01-DEMO-ONEAPPROVAL", "Field Technician - AC", "PENDING_DISTRICT", 8, 3, { decisions: [{ actorId: dev.id, stage: "DISTRICT" }] });
  await makeBatch("PSC-PUN-01-DEMO-BIG", "Data Entry Operator", "PENDING_QUALITY", 60, 4, {
    decisions: [{ actorId: dev.id, stage: "DISTRICT" }, { actorId: meera.id, stage: "DISTRICT" }],
  });
  await makeBatch("PSC-PUN-01-DEMO-FINAL", "Beauty Therapist", "PENDING_STATE", 10, 5, {
    decisions: [{ actorId: dev.id, stage: "DISTRICT" }, { actorId: meera.id, stage: "DISTRICT" }],
  });
  await makeBatch("PSC-PUN-01-DEMO-STUCK", "Welding Technician", "PENDING_DISTRICT", 6, 6, { stageEnteredAt: hoursAgo(72) });
  await makeBatch("PSC-PUN-01-DEMO-SENTBACK", "Tailoring", "SENT_BACK", 5, 7, { lastReason: "Row 3 has the wrong date of birth - please check and resend" });

  // An approved batch: the outbox event makes the worker issue and deliver certificates
  const approved = await makeBatch("PSC-PUN-01-DEMO-ISSUED", "Solar PV Installer", "APPROVED", 5, 8, {
    decisions: [{ actorId: dev.id, stage: "DISTRICT" }, { actorId: meera.id, stage: "DISTRICT" }, { actorId: farah.id, stage: "STATE" }],
  });
  await prisma.outboxEvent.create({
    data: { type: "BATCH_APPROVED", payload: { type: "BATCH_APPROVED", batchId: approved.id, centreId: centre.id, districtId: pune.id, status: "APPROVED" } },
  });

  logger.info({ password: "(see README)" }, "✅ Demo data seeded: Anika, Dev, Meera, Kabir, Neha, Farah");
}

main()
  .catch((err) => {
    logger.error({ err }, "seed failed");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
