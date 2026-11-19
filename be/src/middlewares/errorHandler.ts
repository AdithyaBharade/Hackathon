import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../generated/prisma/client.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";

export const notFound = (req: Request, _res: Response, next: NextFunction) =>
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError)
    return res.status(err.statusCode).json({ success: false, message: err.message });

  if (err instanceof ZodError)
    return res.status(400).json({ success: false, message: "Validation failed", errors: err.issues });

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return res.status(409).json({ success: false, message: "Record already exists" });
    if (err.code === "P2025") return res.status(404).json({ success: false, message: "Record not found" });
  }

  (req.log ?? logger).error({ err }, "Unhandled error");
  return res.status(500).json({ success: false, message: "Internal server error" });
};
