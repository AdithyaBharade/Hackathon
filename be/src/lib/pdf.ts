import { mkdir, rename, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { env } from "../config/env.js";

export interface CertificatePdfData {
  id: string;
  number: string;
  candidateName: string;
  courseName: string;
  grade: string;
  centreName: string;
  districtName: string;
  issuedAt: Date;
}

const dir = () => path.resolve(env.STORAGE_DIR, "certificates");
export const pdfPathFor = (certificateId: string) => path.join(dir(), `${certificateId}.pdf`);
export const verifyUrlFor = (number: string) => `${env.PUBLIC_WEB_URL}/verify/${encodeURIComponent(number)}`;

const exists = (p: string) => stat(p).then(() => true, () => false);

/**
 * Render the certificate once. Idempotent: if the file already exists it is reused,
 * and it is written to a temp file then renamed, so a crash mid-render never leaves
 * a half-written PDF that later looks complete.
 */
export async function ensureCertificatePdf(data: CertificatePdfData): Promise<string> {
  const target = pdfPathFor(data.id);
  if (await exists(target)) return target;
  await mkdir(dir(), { recursive: true });
  const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const qr = await QRCode.toBuffer(verifyUrlFor(data.number), { margin: 1, width: 220 });

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 50 });
    const out = createWriteStream(tmp);
    out.on("finish", resolve).on("error", reject);
    doc.pipe(out);
    const { width, height } = doc.page;
    doc.rect(20, 20, width - 40, height - 40).lineWidth(3).stroke("#1e3a8a");
    doc.fillColor("#1e3a8a").fontSize(14).text("PRAGATI SKILLS MISSION", 0, 60, { align: "center" });
    doc.fontSize(34).text("Certificate of Completion", 0, 90, { align: "center" });
    doc.fillColor("#111").fontSize(14).text("This is to certify that", 0, 160, { align: "center" });
    doc.fontSize(28).text(data.candidateName, 0, 185, { align: "center" });
    doc.fontSize(14).text(`has successfully completed the course`, 0, 235, { align: "center" });
    doc.fontSize(20).text(data.courseName, 0, 258, { align: "center" });
    doc.fontSize(13).text(`with grade ${data.grade} at ${data.centreName}, ${data.districtName}`, 0, 292, { align: "center" });
    doc.fontSize(11).fillColor("#444");
    doc.text(`Certificate No: ${data.number}`, 70, height - 140);
    doc.text(`Issued on: ${data.issuedAt.toISOString().slice(0, 10)}`, 70, height - 122);
    doc.text(`Verify at: ${verifyUrlFor(data.number)}`, 70, height - 104);
    doc.image(qr, width - 200, height - 200, { width: 130 });
    doc.end();
  });
  await rename(tmp, target);
  return target;
}
