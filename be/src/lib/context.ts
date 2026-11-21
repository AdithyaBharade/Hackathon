import type { Request } from "express";
import type { JwtPayload } from "../utils/jwt.js";

/** Who is acting, and the request that carried it (for the audit trail). */
export interface ActionContext {
  user: JwtPayload;
  requestId?: string;
}

export const ctxOf = (req: Request): ActionContext => ({ user: req.user!, requestId: String(req.id) });
