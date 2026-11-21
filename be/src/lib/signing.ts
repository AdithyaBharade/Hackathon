import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

/** Download links are signed so a certificate number alone (which is printed on the
 *  certificate and shown to employers) is not enough to fetch the PDF. */
export const signCertificate = (certificateId: string) =>
  createHmac("sha256", env.CERT_LINK_SECRET).update(`cert:${certificateId}`).digest("base64url");

export const isValidCertificateSignature = (certificateId: string, sig: string) => {
  const expected = Buffer.from(signCertificate(certificateId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
};

export const downloadUrlFor = (number: string, certificateId: string) =>
  `${env.PUBLIC_API_URL}/public/certificates/${encodeURIComponent(number)}/pdf?sig=${signCertificate(certificateId)}`;
