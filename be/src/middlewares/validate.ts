import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

/** Parses req[source] with a zod schema and replaces it with the parsed (typed, coerced) value. */
export const validate =
  (schema: ZodType, source: Source = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[source]);
    // Express 5 exposes req.query as a getter, so redefine instead of assigning
    Object.defineProperty(req, source, { value: parsed, writable: true, configurable: true, enumerable: true });
    next();
  };
