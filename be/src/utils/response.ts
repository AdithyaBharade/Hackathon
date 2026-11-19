import type { Response } from "express";

export const sendSuccess = <T>(res: Response, data: T, status = 200, message?: string) =>
  res.status(status).json({ success: true, data, message });
