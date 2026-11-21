import { defineConfig } from "vitest/config";

/**
 * Integration tests run against a real Postgres and Redis (no mocks of either):
 * the guarantees under test - row locks, unique keys, sequences - live in the database.
 * Override TEST_DATABASE_URL / TEST_REDIS_URL to point elsewhere.
 */
const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://certiflow:certiflow@localhost:5433/certiflow_test";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    fileParallelism: false, // files share one database
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: "forks",
    env: {
      NODE_ENV: "test",
      LOG_LEVEL: "warn",
      DATABASE_URL: databaseUrl,
      DIRECT_URL: databaseUrl,
      REDIS_URL: process.env.TEST_REDIS_URL ?? "redis://localhost:6380/1",
      JWT_ACCESS_SECRET: "test-access-secret-0123456789",
      CERT_LINK_SECRET: "test-link-secret-0123456789",
      STORAGE_DIR: "./storage-test",
      WHATSAPP_API_URL: "http://127.0.0.1:8199",
      WHATSAPP_TIMEOUT_MS: "200",
      WHATSAPP_RETRY_BASE_MS: "20",
      WHATSAPP_MAX_ATTEMPTS: "20",
      WHATSAPP_RETRY_MAX_MS: "100",
      DISTRICT_QUORUM: "2",
      BIG_BATCH_THRESHOLD: "50",
      STUCK_AFTER_MINUTES: "60",
    },
  },
});
