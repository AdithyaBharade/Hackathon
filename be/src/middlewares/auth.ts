import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError.js";
import { verifyToken, type JwtPayload } from "../utils/jwt.js";

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(new ApiError(401, "Missing token"));
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired token"));
  }
};

export const authorize =
  (...roles: JwtPayload["role"][]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, "Forbidden"));
    next();
  };
