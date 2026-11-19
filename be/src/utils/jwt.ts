import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export interface JwtPayload {
  sub: string;
  role: "USER" | "ADMIN";
}

export const signAccessToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m` });

export const verifyAccessToken = (token: string) => {
  const { sub, role } = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  return { sub, role };
};
