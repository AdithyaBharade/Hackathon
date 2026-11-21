import { randomBytes } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { Prisma, type BatchStatus } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { paginated, toSkipTake } from "../utils/paginate.js";
import { audit } from "../lib/audit.js";
import { emit } from "../lib/events.js";
import type { ActionContext } from "../lib/context.js";
import { parseCandidateSheet } from "../lib/spreadsheet.js";
import {
  EDITABLE_STATUSES,
  PENDING_STATUSES,
  requiredApprovals,
  roleForStage,
  stageOf,
  statusAfterApproval,
} from "../domain/workflow.js";
import { maskMobile } from "../validators/fields.js";
import type { CreateBatchInput, DecisionInput, ListBatchesQuery } from "../validators/batch.validator.js";

type Tx = Prisma.TransactionClient;

/** Rows each role may see. Applied to every read and write so nobody can act on,
 *  or even learn about, a batch outside their scope. */
export const scopeFor = ({ user }: ActionContext): Prisma.BatchWhereInput => {
  switch (user.role) {
    case "CENTRE":
      return { centreId: user.centreId ?? "__none__" };
    case "DISTRICT_OFFICER":
      return { districtId: user.districtId ?? "__none__", status: { not: "DRAFT" } };
    case "QUALITY":
    case "STATE":
      return { status: { not: "DRAFT" } };
  }
};

const batchListSelect = {
  id: true,
  code: true,
  courseName: true,
  trainingEndDate: true,
  status: true,
  version: true,
  candidateCount: true,
  stageEnteredAt: true,
  escalatedAt: true,
  lastReason: true,
  createdAt: true,
  updatedAt: true,
  centre: { select: { id: true, name: true, code: true } },
  district: { select: { id: true, name: true } },
} satisfies Prisma.BatchSelect;

/** Lock the batch row for the rest of the transaction. Concurrent decisions on the
 *  same batch queue up here, so each sees the previous one's result. */
const lockBatch = async (tx: Tx, ctx: ActionContext, id: string) => {
  await tx.$queryRaw`SELECT id FROM batches WHERE id = ${id} FOR UPDATE`;
  const batch = await tx.batch.findFirst({ where: { id, ...scopeFor(ctx) } });
  if (!batch) throw new ApiError(404, "Batch not found");
  return batch;
};

const newBatchCode = (centreCode: string) =>
  `${centreCode}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`;

export const batchService = {
  async create(ctx: ActionContext, input: CreateBatchInput) {
    const centre = await prisma.trainingCentre.findUnique({ where: { id: ctx.user.centreId ?? "" } });
    if (!centre) throw new ApiError(403, "Your account is not linked to a training centre");
    return prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          code: newBatchCode(centre.code),
          courseName: input.courseName,
          trainingEndDate: input.trainingEndDate,
          centreId: centre.id,
          districtId: centre.districtId,
          createdById: ctx.user.sub,
        },
        select: batchListSelect,
      });
      await audit(tx, ctx, { entityType: "BATCH", entityId: batch.id, batchId: batch.id, action: "CREATED" });
      await emit(tx, { type: "BATCH_CREATED", batchId: batch.id, centreId: centre.id, districtId: centre.districtId, status: batch.status });
      return batch;
    });
  },

  async list(ctx: ActionContext, { page, limit, search, status, inbox }: ListBatchesQuery) {
    const and: Prisma.BatchWhereInput[] = [scopeFor(ctx)];
    if (status) and.push({ status });
    if (search) and.push({ OR: [{ code: { contains: search, mode: "insensitive" } }, { courseName: { contains: search, mode: "insensitive" } }] });
    if (inbox) and.push(await inboxFilter(ctx));
    const where: Prisma.BatchWhereInput = { AND: and };
    const [items, total] = await prisma.$transaction([
      prisma.batch.findMany({ where, select: batchListSelect, orderBy: { updatedAt: "desc" }, ...toSkipTake(page, limit) }),
      prisma.batch.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  },

  async get(ctx: ActionContext, id: string) {
    const batch = await prisma.batch.findFirst({
      where: { id, ...scopeFor(ctx) },
      select: {
        ...batchListSelect,
        candidates: {
          orderBy: { rowNumber: "asc" },
          select: {
            id: true,
            rowNumber: true,
            name: true,
            mobile: true,
            dateOfBirth: true,
            grade: true,
            certificate: { select: { id: true, number: true, status: true, deliveryStatus: true, deliveryAttempts: true } },
          },
        },
        decisions: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            batchVersion: true,
            stage: true,
            action: true,
            reason: true,
            retractedAt: true,
            createdAt: true,
            actor: { select: { id: true, name: true, role: true } },
          },
        },
      },
    });
    if (!batch) throw new ApiError(404, "Batch not found");
    const stage = stageOf(batch.status);
    const currentApprovals = stage
      ? batch.decisions.filter((d) => d.batchVersion === batch.version && d.stage === stage && d.action === "APPROVE" && !d.retractedAt).length
      : 0;
    // Officers see contact numbers masked; only the owning centre sees them in full
    const candidates =
      ctx.user.role === "CENTRE" ? batch.candidates : batch.candidates.map((c) => ({ ...c, mobile: maskMobile(c.mobile) }));
    return {
      ...batch,
      candidates,
      workflow: {
        stage,
        currentApprovals,
        requiredApprovals: stage ? requiredApprovals(stage) : 0,
        canAct: !!stage && roleForStage[stage] === ctx.user.role,
        myDecision:
          batch.decisions.find((d) => d.actor.id === ctx.user.sub && d.batchVersion === batch.version && d.stage === stage && !d.retractedAt) ?? null,
      },
    };
  },

  async timeline(ctx: ActionContext, id: string) {
    const batch = await prisma.batch.findFirst({ where: { id, ...scopeFor(ctx) }, select: { id: true } });
    if (!batch) throw new ApiError(404, "Batch not found");
    const events = await prisma.auditEvent.findMany({ where: { batchId: id }, orderBy: { createdAt: "asc" }, take: 500 });
    const actorIds = [...new Set(events.map((e) => e.actorId).filter((x): x is string => !!x))];
    const actors = await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
    const nameOf = new Map(actors.map((a) => [a.id, a.name]));
    return events.map((e) => ({ ...e, actorName: e.actorId ? nameOf.get(e.actorId) ?? null : "System" }));
  },

  /** Replace the batch's candidates with the uploaded sheet: all rows or none. */
  async uploadCandidates(ctx: ActionContext, id: string, file: { buffer: Buffer; originalname: string }) {
    const parsed = await parseCandidateSheet(file.buffer, file.originalname, env.MAX_CANDIDATES_PER_BATCH);
    if (!parsed.ok) {
      const rows = new Set(parsed.errors.map((e) => e.row).filter((r) => r > 0)).size;
      throw new ApiError(400, rows ? `${rows} row(s) have problems. Nothing was saved.` : parsed.errors[0]!.message, parsed.errors);
    }

    return prisma.$transaction(async (tx) => {
      const batch = await lockBatch(tx, ctx, id);
      if (!EDITABLE_STATUSES.includes(batch.status))
        throw new ApiError(409, "Candidates can only be changed while the batch is a draft or has been sent back");

      // A person already holding a valid certificate for this course must not get a second one
      const already = await tx.candidate.findMany({
        where: {
          mobile: { in: parsed.rows.map((r) => r.mobile) },
          batchId: { not: id },
          certificate: { status: "ISSUED" },
          batch: { courseName: { equals: batch.courseName, mode: "insensitive" } },
        },
        select: { mobile: true },
      });
      if (already.length) {
        const holders = new Set(already.map((a) => a.mobile));
        const errors = parsed.rows
          .filter((r) => holders.has(r.mobile))
          .map((r) => ({ row: r.rowNumber, field: "mobile", message: "This candidate already holds a certificate for this course" }));
        throw new ApiError(400, `${errors.length} row(s) have problems. Nothing was saved.`, errors);
      }

      await tx.candidate.deleteMany({ where: { batchId: id } });
      await tx.candidate.createMany({ data: parsed.rows.map((r) => ({ ...r, batchId: id })) });
      const updated = await tx.batch.update({ where: { id }, data: { candidateCount: parsed.rows.length }, select: batchListSelect });
      await audit(tx, ctx, {
        entityType: "BATCH",
        entityId: id,
        batchId: id,
        action: "CANDIDATES_UPLOADED",
        data: { file: file.originalname, count: parsed.rows.length, replaced: batch.candidateCount },
      });
      await emit(tx, { type: "BATCH_UPDATED", batchId: id, centreId: batch.centreId, districtId: batch.districtId, status: batch.status });
      return updated;
    });
  },

  /**
   * Send (or resend) for approval. Each submission is a new version; decisions are
   * tied to a version, so approvals given to an earlier version no longer count.
   * The centre may have changed anything, so every reviewer looks again.
   */
  async submit(ctx: ActionContext, id: string) {
    return prisma.$transaction(async (tx) => {
      const batch = await lockBatch(tx, ctx, id);
      if (!EDITABLE_STATUSES.includes(batch.status)) throw new ApiError(409, `Batch is already ${batch.status.toLowerCase().replace("_", " ")}`);
      if (batch.candidateCount === 0) throw new ApiError(400, "Upload candidates before submitting");
      const updated = await tx.batch.update({
        where: { id },
        data: { status: "PENDING_DISTRICT", version: { increment: 1 }, stageEnteredAt: new Date(), escalatedAt: null },
        select: batchListSelect,
      });
      await audit(tx, ctx, {
        entityType: "BATCH",
        entityId: id,
        batchId: id,
        action: batch.status === "SENT_BACK" ? "RESUBMITTED" : "SUBMITTED",
        data: { version: updated.version, candidateCount: batch.candidateCount, previousApprovalsReset: batch.version > 0 },
      });
      await emit(tx, { type: "BATCH_SUBMITTED", batchId: id, centreId: batch.centreId, districtId: batch.districtId, status: updated.status });
      return updated;
    });
  },

  /**
   * Approve / reject / send back at the batch's current stage.
   * Safe under concurrency: the row lock serialises decisions on one batch, the
   * unique (batch, version, stage, actor) key stops an officer counting twice, and
   * the status check means a stage can only be advanced once.
   */
  async decide(ctx: ActionContext, id: string, input: DecisionInput) {
    return prisma.$transaction(async (tx) => {
      const batch = await lockBatch(tx, ctx, id);
      const stage = stageOf(batch.status);
      if (!stage) throw new ApiError(409, `Batch is ${batch.status.toLowerCase().replace("_", " ")} and not awaiting a decision`);
      if (roleForStage[stage] !== ctx.user.role) throw new ApiError(403, `Only the ${stage.toLowerCase()} stage reviewers can decide now`);
      if (input.version !== batch.version)
        throw new ApiError(409, "The batch was changed since you opened it. Reload and review it again.");

      const key = { batchId_batchVersion_stage_actorId: { batchId: id, batchVersion: batch.version, stage, actorId: ctx.user.sub } };
      const existing = await tx.decision.findUnique({ where: key });
      if (existing && !existing.retractedAt) throw new ApiError(409, "You have already recorded a decision on this batch");

      const decision = existing
        ? await tx.decision.update({ where: { id: existing.id }, data: { action: input.action, reason: input.reason ?? null, retractedAt: null } })
        : await tx.decision.create({
            data: { batchId: id, batchVersion: batch.version, stage, action: input.action, reason: input.reason ?? null, actorId: ctx.user.sub },
          });

      let next: BatchStatus = batch.status;
      if (input.action === "REJECT") next = "REJECTED";
      else if (input.action === "SEND_BACK") next = "SENT_BACK";
      else {
        const approvals = await tx.decision.count({
          where: { batchId: id, batchVersion: batch.version, stage, action: "APPROVE", retractedAt: null },
        });
        if (approvals >= requiredApprovals(stage)) next = statusAfterApproval(stage, batch.candidateCount);
      }

      const moved = next !== batch.status;
      await audit(tx, ctx, {
        entityType: "BATCH",
        entityId: id,
        batchId: id,
        action: `DECISION_${input.action}`,
        data: { stage, version: batch.version, reason: input.reason ?? null, from: batch.status, to: next, decisionId: decision.id },
      });
      if (moved) {
        await tx.batch.update({
          where: { id },
          data: {
            status: next,
            stageEnteredAt: new Date(),
            escalatedAt: null,
            lastReason: input.action === "APPROVE" ? batch.lastReason : (input.reason ?? null),
          },
        });
        await audit(tx, null, { entityType: "BATCH", entityId: id, batchId: id, action: "STATUS_CHANGED", data: { from: batch.status, to: next } });
      }
      const base = { batchId: id, centreId: batch.centreId, districtId: batch.districtId, status: next, requestId: ctx.requestId };
      await emit(tx, { type: next === "APPROVED" ? "BATCH_APPROVED" : "BATCH_DECISION", ...base });
      return { decision, status: next, moved };
    });
  },

  /** Officers make mistakes: withdraw your own approval while the stage is still open. */
  async retract(ctx: ActionContext, id: string) {
    return prisma.$transaction(async (tx) => {
      const batch = await lockBatch(tx, ctx, id);
      const stage = stageOf(batch.status);
      if (!stage) throw new ApiError(409, "This stage has already been decided; ask the state office to send the batch back");
      const mine = await tx.decision.findUnique({
        where: { batchId_batchVersion_stage_actorId: { batchId: id, batchVersion: batch.version, stage, actorId: ctx.user.sub } },
      });
      if (!mine || mine.retractedAt) throw new ApiError(404, "You have no active decision on this batch");
      await tx.decision.update({ where: { id: mine.id }, data: { retractedAt: new Date() } });
      await audit(tx, ctx, { entityType: "BATCH", entityId: id, batchId: id, action: "DECISION_RETRACTED", data: { stage, version: batch.version, decisionId: mine.id } });
      await emit(tx, { type: "BATCH_DECISION", batchId: id, centreId: batch.centreId, districtId: batch.districtId, status: batch.status });
      return { retracted: true };
    });
  },

  /** For the state office: batches waiting longer than the SLA, oldest first. */
  async stuck(ctx: ActionContext) {
    const cutoff = new Date(Date.now() - env.STUCK_AFTER_MINUTES * 60_000);
    return prisma.batch.findMany({
      where: { ...scopeFor(ctx), status: { in: PENDING_STATUSES }, stageEnteredAt: { lt: cutoff } },
      select: batchListSelect,
      orderBy: { stageEnteredAt: "asc" },
      take: 100,
    });
  },

  async summary(ctx: ActionContext) {
    const groups = await prisma.batch.groupBy({ by: ["status"], where: scopeFor(ctx), _count: { _all: true } });
    return Object.fromEntries(groups.map((g) => [g.status, g._count._all]));
  },
};

/** "Waiting for me": the batch is at my stage and I have not decided on its current version yet. */
async function inboxFilter({ user }: ActionContext): Promise<Prisma.BatchWhereInput> {
  if (user.role === "CENTRE") return { status: { in: ["DRAFT", "SENT_BACK"] } };
  const status: BatchStatus = user.role === "DISTRICT_OFFICER" ? "PENDING_DISTRICT" : user.role === "QUALITY" ? "PENDING_QUALITY" : "PENDING_STATE";
  // Prisma can't compare two columns, so find "already decided on this version" in SQL
  const decided = await prisma.$queryRaw<{ id: string }[]>`
    SELECT b.id FROM batches b
    JOIN decisions d ON d."batchId" = b.id AND d."batchVersion" = b.version
    WHERE d."actorId" = ${user.sub} AND d."retractedAt" IS NULL AND b.status = ${status}::"BatchStatus"`;
  return { status, id: { notIn: decided.map((d) => d.id) } };
}
