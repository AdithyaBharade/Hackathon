import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../generated/prisma/client.js";

/** Identity carried in the signed access token. Scope (district / centre) is
 *  part of the signature, so a tampered token cannot widen what a user sees. */
export interface JwtPayload {
  sub: string;
  role: Role;
  districtId: string | null;
  centreId: string | null;
}

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`, algorithm: "HS256" });

export const verifyAccessToken = (token: string): JwtPayload => {
  const { sub, role, districtId, centreId } = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  }) as JwtPayload;
  return { sub, role, districtId: districtId ?? null, centreId: centreId ?? null };
};
