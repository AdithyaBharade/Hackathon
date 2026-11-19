import pino from "pino";
import { env, isProd } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password"],
  ...(isProd ? {} : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } } }),
});
