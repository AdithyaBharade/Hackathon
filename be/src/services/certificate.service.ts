import { createReadStream } from "node:fs";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { cached, invalidate } from "../utils/cache.js";
import { paginated, toSkipTake } from "../utils/paginate.js";
import { audit } from "../lib/audit.js";
import { emit, publishRealtime } from "../lib/events.js";
import type { ActionContext } from "../lib/context.js";
import { ensureCertificatePdf } from "../lib/pdf.js";
import { downloadUrlFor, isValidCertificateSignature } from "../lib/signing.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { enqueueDelivery } from "../jobs/queues/index.js";
import { scopeFor } from "./batch.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { ListCertificatesQuery } from "../validators/certificate.validator.js";

const verifyKey = (number: string) => `verify:${number}`;
const VERIFY_TTL_SECONDS = 30;

/** "Anika Sharma" -> "An*** Sh****": enough for an employer to match, not enough to harvest. */
export const maskName = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part.slice(0, 2) + "*".repeat(Math.max(1, part.length - 2)))
    .join(" ");

const loadForDelivery = (id: string) =>
  prisma.certificate.findUnique({
    where: { id },
    include: { candidate: true, batch: { include: { centre: true, district: true } } },
  });

export const certificateService = {
  /**
   * Create one certificate per candidate of an approved batch, then fan out delivery.
   * Safe to run any number of times, concurrently: the unique candidateId means a
   * second run inserts nothing (ON CONFLICT DO NOTHING), and numbers come from a DB
   * sequence so two certificates can never share one.
   */
  async issueForBatch(batchId: string, requestId?: string) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId }, select: { id: true, status: true, centreId: true, districtId: true } });
    if (!batch) throw new Error(`Batch ${batchId} not found`);
    if (batch.status !== "APPROVED") {
      logger.warn({ batchId, status: batch.status }, "issuance skipped: batch not approved");
      return { created: 0, total: 0 };
    }
    const candidates = await prisma.candidate.findMany({ where: { batchId }, select: { id: true } });

    const created = await prisma.$transaction(async (tx) => {
      const { count } = await tx.certificate.createMany({
        data: candidates.map((c) => ({ candidateId: c.id, batchId })),
        skipDuplicates: true,
      });
      if (count > 0) {
        await audit(tx, { requestId }, { entityType: "BATCH", entityId: batchId, batchId, action: "CERTIFICATES_ISSUED", data: { count } });
        await emit(tx, { type: "CERTIFICATES_ISSUED", batchId, centreId: batch.centreId, districtId: batch.districtId, requestId });
      }
      return count;
    });

    // Re-enqueue anything not yet delivered (covers a crash between create and enqueue)
    const pending = await prisma.certificate.findMany({ where: { batchId, deliveryStatus: "PENDING", status: "ISSUED" }, select: { id: true } });
    for (const c of pending) await enqueueDelivery({ certificateId: c.id, requestId });
    logger.info({ batchId, created, enqueued: pending.length, requestId }, "certificates issued");
    return { created, total: candidates.length };
  },

  /** One delivery attempt. Throws on retryable failure so the queue retries it. */
  async deliver(certificateId: string, attempt: number) {
    const cert = await loadForDelivery(certificateId);
    if (!cert) throw new Error(`Certificate ${certificateId} not found`);
    if (cert.deliveryStatus === "SENT") return { skipped: "already sent" };
    if (cert.status === "REVOKED") return { skipped: "revoked" };

    await ensureCertificatePdf({
      id: cert.id,
      number: cert.number,
      candidateName: cert.candidate.name,
      courseName: cert.batch.courseName,
      grade: cert.candidate.grade,
      centreName: cert.batch.centre.name,
      districtName: cert.batch.district.name,
      issuedAt: cert.issuedAt,
    });
    await prisma.certificate.update({ where: { id: cert.id }, data: { pdfPath: `certificates/${cert.id}.pdf`, deliveryAttempts: attempt } });

    try {
      const { messageId } = await sendWhatsApp({
        to: cert.candidate.mobile,
        idempotencyKey: cert.id,
        templateName: "certificate_issued",
        params: {
          name: cert.candidate.name,
          course: cert.batch.courseName,
          certificateNumber: cert.number,
          downloadUrl: downloadUrlFor(cert.number, cert.id),
        },
      });
      await prisma.$transaction(async (tx) => {
        await tx.certificate.update({
          where: { id: cert.id },
          data: { deliveryStatus: "SENT", providerMessageId: messageId, deliveredAt: new Date(), lastDeliveryError: null },
        });
        await audit(tx, null, { entityType: "CERTIFICATE", entityId: cert.id, batchId: cert.batchId, action: "DELIVERED", data: { attempt, messageId } });
      });
      publishRealtime({ type: "CERTIFICATE_DELIVERY", batchId: cert.batchId, certificateId: cert.id, centreId: cert.batch.centreId, districtId: cert.batch.districtId, status: "SENT" });
      return { messageId };
    } catch (err) {
      await prisma.certificate.update({ where: { id: cert.id }, data: { lastDeliveryError: (err as Error).message } });
      throw err;
    }
  },

  /** Called when the queue has given up on a certificate. */
  async markDeliveryFailed(certificateId: string, reason: string) {
    const cert = await prisma.certificate.findUnique({ where: { id: certificateId }, include: { batch: true } });
    if (!cert || cert.deliveryStatus === "SENT") return;
    await prisma.$transaction(async (tx) => {
      await tx.certificate.update({ where: { id: certificateId }, data: { deliveryStatus: "FAILED", lastDeliveryError: reason } });
      await audit(tx, null, { entityType: "CERTIFICATE", entityId: certificateId, batchId: cert.batchId, action: "DELIVERY_FAILED", data: { reason } });
      await tx.notification.create({
        data: { role: "STATE", batchId: cert.batchId, type: "DELIVERY_FAILED", message: `WhatsApp delivery of ${cert.number} failed after all retries: ${reason}` },
      });
    });
    publishRealtime({ type: "CERTIFICATE_DELIVERY", batchId: cert.batchId, certificateId, status: "FAILED" });
  },

  async resend(ctx: ActionContext, id: string) {
    const cert = await prisma.certificate.findUnique({ where: { id } });
    if (!cert) throw new ApiError(404, "Certificate not found");
    if (cert.status === "REVOKED") throw new ApiError(409, "A revoked certificate cannot be sent");
    if (cert.deliveryStatus === "SENT") throw new ApiError(409, "Already delivered");
    await prisma.$transaction(async (tx) => {
      await tx.certificate.update({ where: { id }, data: { deliveryStatus: "PENDING" } });
      await audit(tx, ctx, { entityType: "CERTIFICATE", entityId: id, batchId: cert.batchId, action: "RESEND_REQUESTED" });
    });
    await enqueueDelivery({ certificateId: id, requestId: ctx.requestId }, { retry: true });
    return { queued: true };
  },

  async revoke(ctx: ActionContext, id: string, reason: string) {
    const result = await prisma.$transaction(async (tx) => {
      // Conditional update: two concurrent revokes can't both "win"
      const { count } = await tx.certificate.updateMany({
        where: { id, status: "ISSUED" },
        data: { status: "REVOKED", revokedAt: new Date(), revokedById: ctx.user.sub, revokeReason: reason },
      });
      const cert = await tx.certificate.findUnique({ where: { id }, include: { batch: true } });
      if (!cert) throw new ApiError(404, "Certificate not found");
      if (count === 0) throw new ApiError(409, "Certificate is already revoked");
      await audit(tx, ctx, { entityType: "CERTIFICATE", entityId: id, batchId: cert.batchId, action: "REVOKED", data: { reason, number: cert.number } });
      await emit(tx, { type: "CERTIFICATE_REVOKED", batchId: cert.batchId, certificateId: id, centreId: cert.batch.centreId, districtId: cert.batch.districtId });
      return cert;
    });
    // Drop the cached verification result now, so the next lookup reads the database
    await invalidate(verifyKey(result.number));
    return { id: result.id, number: result.number, status: result.status, revokedAt: result.revokedAt };
  },

  async list(ctx: ActionContext, { page, limit, search, batchId, status }: ListCertificatesQuery) {
    const where: Prisma.CertificateWhereInput = {
      batch: scopeFor(ctx),
      ...(batchId ? { batchId } : {}),
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ number: { contains: search, mode: "insensitive" } }, { candidate: { name: { contains: search, mode: "insensitive" } } }] } : {}),
    };
    const [items, total] = await prisma.$transaction([
      prisma.certificate.findMany({
        where,
        select: {
          id: true,
          number: true,
          status: true,
          deliveryStatus: true,
          deliveryAttempts: true,
          lastDeliveryError: true,
          issuedAt: true,
          revokedAt: true,
          revokeReason: true,
          candidate: { select: { name: true } },
          batch: { select: { id: true, code: true, courseName: true, centre: { select: { name: true } } } },
        },
        orderBy: { issuedAt: "desc" },
        ...toSkipTake(page, limit),
      }),
      prisma.certificate.count({ where }),
    ]);
    return paginated(items, total, page, limit);
  },

  async timeline(ctx: ActionContext, id: string) {
    const cert = await prisma.certificate.findFirst({ where: { id, batch: scopeFor(ctx) }, select: { id: true } });
    if (!cert) throw new ApiError(404, "Certificate not found");
    return prisma.auditEvent.findMany({ where: { entityType: "CERTIFICATE", entityId: id }, orderBy: { createdAt: "asc" } });
  },

  /** Public, unauthenticated. Shows only what an employer needs to match the paper. */
  verify: (number: string) =>
    cached(verifyKey(number), VERIFY_TTL_SECONDS, async () => {
      const cert = await prisma.certificate.findUnique({
        where: { number },
        select: {
          number: true,
          status: true,
          issuedAt: true,
          revokedAt: true,
          candidate: { select: { name: true, grade: true } },
          batch: { select: { courseName: true, centre: { select: { name: true } }, district: { select: { name: true } } } },
        },
      });
      if (!cert) return { found: false as const, number };
      return {
        found: true as const,
        valid: cert.status === "ISSUED",
        status: cert.status,
        number: cert.number,
        holderName: maskName(cert.candidate.name),
        course: cert.batch.courseName,
        grade: cert.candidate.grade,
        centre: cert.batch.centre.name,
        district: cert.batch.district.name,
        issuedAt: cert.issuedAt,
        revokedAt: cert.revokedAt,
      };
    }),

  /** Public download via the signed link in the WhatsApp message. */
  async openPdf(number: string, sig: string) {
    const cert = await loadForDelivery((await prisma.certificate.findUnique({ where: { number }, select: { id: true } }))?.id ?? "");
    // Same answer for "no such number" and "bad signature": don't help enumeration
    if (!cert || !isValidCertificateSignature(cert.id, sig)) throw new ApiError(403, "This download link is not valid");
    if (cert.status === "REVOKED") throw new ApiError(410, "This certificate has been revoked");
    const file = await ensureCertificatePdf({
      id: cert.id,
      number: cert.number,
      candidateName: cert.candidate.name,
      courseName: cert.batch.courseName,
      grade: cert.candidate.grade,
      centreName: cert.batch.centre.name,
      districtName: cert.batch.district.name,
      issuedAt: cert.issuedAt,
    });
    return { stream: createReadStream(file), filename: `${cert.number}.pdf` };
  },
};
