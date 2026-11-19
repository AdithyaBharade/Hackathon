import pino from "pino";
import { env, isProd } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    // Never log credentials or government / bank IDs
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.aadhaar",
      "*.pan",
      "*.accountNumber",
      "*.otp",
    ],
    censor: "[REDACTED]",
  },
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } }),
});
