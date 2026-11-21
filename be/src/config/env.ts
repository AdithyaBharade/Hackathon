import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(8000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("lax"),
  COOKIE_DOMAIN: z.string().optional().transform((v) => v || undefined),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

  // --- Workflow rules (see README "Decisions") ---
  /** Distinct district officers who must approve before a batch leaves the district */
  DISTRICT_QUORUM: z.coerce.number().int().min(1).default(2),
  /** Batches with more candidates than this also go to the quality team */
  BIG_BATCH_THRESHOLD: z.coerce.number().int().min(1).default(50),
  /** A batch waiting at one stage longer than this is escalated to the state office */
  STUCK_AFTER_MINUTES: z.coerce.number().min(0.1).default(2880),
  STUCK_CHECK_EVERY_SECONDS: z.coerce.number().int().min(5).default(30),
  MAX_CANDIDATES_PER_BATCH: z.coerce.number().int().default(1000),

  // --- Certificates & delivery ---
  /** HMAC secret for candidate download links. Rotating it invalidates old links. */
  CERT_LINK_SECRET: z.string().min(16),
  /** Public base URL of the API, used inside WhatsApp messages and QR codes */
  PUBLIC_API_URL: z.string().default("http://localhost:8000/api"),
  /** Public base URL of the web app (verification page) */
  PUBLIC_WEB_URL: z.string().default("http://localhost:5173"),
  STORAGE_DIR: z.string().default("./storage"),
  WHATSAPP_API_URL: z.string().default("http://localhost:8100"),
  WHATSAPP_TIMEOUT_MS: z.coerce.number().int().default(3000),
  WHATSAPP_MAX_ATTEMPTS: z.coerce.number().int().default(8),
  WHATSAPP_RETRY_BASE_MS: z.coerce.number().int().default(2000),
  /** Backoff is exponential but capped, so deliveries resume soon after an outage ends */
  WHATSAPP_RETRY_MAX_MS: z.coerce.number().int().default(300_000),
  WORKER_CONCURRENCY: z.coerce.number().int().default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
