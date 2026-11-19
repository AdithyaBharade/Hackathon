import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { ACCESS_COOKIE } from "../utils/cookies.js";
import { verifyAccessToken, type JwtPayload } from "../utils/jwt.js";

/** Reads the access token from the httpOnly cookie (Bearer header as fallback for API clients). */
export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[ACCESS_COOKIE] ?? (header?.startsWith("Bearer ") ? header.slice(7) : undefined);
  if (!token) return next(new ApiError(401, "Not authenticated"));
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    next(new ApiError(401, err instanceof jwt.TokenExpiredError ? "Access token expired" : "Invalid access token"));
  }
};

export const authorize =
  (...roles: JwtPayload["role"][]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new ApiError(403, "Forbidden"));
    next();
  };
