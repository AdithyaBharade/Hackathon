/**
 * Stand-in for the WhatsApp Business API. Runs as its own container so the real
 * system talks to it over HTTP exactly as it would talk to the real provider.
 *
 * Misbehaves on purpose (configurable, and changeable at runtime for demos):
 *  - failRate:    responds 500/503 without sending
 *  - timeoutRate: *accepts and delivers* the message, then never answers in time
 *                 (the nasty case: the caller sees a timeout although it went through)
 *  - outage:      every request fails (simulate a provider outage)
 * Honours the Idempotency-Key header like real payment/messaging APIs: a repeat key
 * returns the original message id instead of delivering again.
 *
 * GET /v1/inbox?to=... shows what landed on a phone, so tests and the demo can
 * check "exactly one certificate per candidate".
 */
import express from "express";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";

export interface MockOptions {
  failRate: number;
  timeoutRate: number;
  hangMs: number;
  outage: boolean;
}

interface Delivered {
  id: string;
  to: string;
  template: string;
  params: Record<string, string>;
  idempotencyKey: string;
  at: string;
}

export function createWhatsAppMock(initial: Partial<MockOptions> = {}) {
  const opts: MockOptions = { failRate: 0.2, timeoutRate: 0.1, hangMs: 10_000, outage: false, ...initial };
  const byKey = new Map<string, Delivered>();
  const inbox: Delivered[] = [];
  const stats = { requests: 0, failed: 0, timedOut: 0, duplicatesSuppressed: 0, delivered: 0 };

  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use((_req, res, next) => {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-headers", "content-type");
    next();
  });

  app.post("/v1/messages", (req, res) => {
    stats.requests++;
    const key = req.get("idempotency-key");
    const { to, template, params } = req.body ?? {};
    if (!key || typeof to !== "string" || !/^\+91[6-9]\d{9}$/.test(to) || !template)
      return res.status(400).json({ error: "invalid request" });

    if (opts.outage || Math.random() < opts.failRate) {
      stats.failed++;
      return res.status(Math.random() < 0.5 ? 500 : 503).json({ error: "provider unavailable" });
    }

    const previous = byKey.get(key);
    if (previous) {
      stats.duplicatesSuppressed++;
      return res.status(200).json({ id: previous.id, duplicate: true });
    }

    const msg: Delivered = { id: `wamid.${randomUUID()}`, to, template, params, idempotencyKey: key, at: new Date().toISOString() };
    byKey.set(key, msg);
    inbox.push(msg);
    stats.delivered++;

    if (Math.random() < opts.timeoutRate) {
      stats.timedOut++;
      // Delivered, but the acknowledgement arrives too late for the caller
      const t = setTimeout(() => res.headersSent || res.status(200).json({ id: msg.id }), opts.hangMs);
      res.on("close", () => clearTimeout(t));
      return;
    }
    res.status(200).json({ id: msg.id });
  });

  app.get("/v1/inbox", (req, res) => {
    const to = typeof req.query.to === "string" ? req.query.to : undefined;
    res.json({ messages: to ? inbox.filter((m) => m.to === to || m.to === `+91${to}`) : inbox.slice(-200) });
  });
  app.get("/v1/stats", (_req, res) => res.json({ ...stats, options: opts, uniquePhones: new Set(inbox.map((m) => m.to)).size }));
  app.post("/v1/config", (req, res) => {
    for (const k of ["failRate", "timeoutRate", "hangMs"] as const) if (typeof req.body?.[k] === "number") opts[k] = req.body[k];
    if (typeof req.body?.outage === "boolean") opts.outage = req.body.outage;
    res.json(opts);
  });
  app.get("/health", (_req, res) => res.json({ ok: true }));

  return {
    app,
    opts,
    inbox,
    stats,
    listen: (port: number) => new Promise<Server>((resolve) => { const s = app.listen(port, () => resolve(s)); }),
  };
}

// Run standalone: `npm run dev:whatsapp` / container entrypoint
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!)) {
  const num = (v: string | undefined, d: number) => (v === undefined || v === "" ? d : Number(v));
  const mock = createWhatsAppMock({
    failRate: num(process.env.MOCK_FAIL_RATE, 0.2),
    timeoutRate: num(process.env.MOCK_TIMEOUT_RATE, 0.1),
    hangMs: num(process.env.MOCK_HANG_MS, 10_000),
  });
  const port = num(process.env.PORT, 8100);
  mock.listen(port).then(() => console.log(`📱 WhatsApp stand-in on :${port}`, mock.opts));
}
