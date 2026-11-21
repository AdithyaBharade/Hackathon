/**
 * Server-Sent Events hub. Every API instance subscribes to the Redis channel and
 * forwards events to its own connected browsers, so live updates work no matter
 * which instance a user is connected to or which instance/worker caused the change.
 * Events only say "batch X changed"; the browser refetches through the normal,
 * access-checked API, so the stream itself never carries data a user can't see.
 */
import type { Request, Response } from "express";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import type { JwtPayload } from "../utils/jwt.js";
import { REALTIME_CHANNEL, type DomainEvent } from "./events.js";

interface Client {
  user: JwtPayload;
  res: Response;
}
const clients = new Set<Client>();

const canSee = (user: JwtPayload, e: DomainEvent) => {
  if (user.role === "CENTRE") return !!e.centreId && e.centreId === user.centreId;
  if (user.role === "DISTRICT_OFFICER") return !e.districtId || e.districtId === user.districtId;
  return true;
};

let subscriber: Redis | null = null;
export function startRealtimeHub() {
  subscriber = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: (n) => Math.min(n * 500, 10_000) });
  subscriber.on("error", () => {});
  subscriber.subscribe(REALTIME_CHANNEL).catch(() => {});
  subscriber.on("message", (_ch, raw) => {
    let event: DomainEvent;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    for (const c of clients) if (canSee(c.user, event)) c.res.write(`event: change\ndata: ${JSON.stringify(event)}\n\n`);
  });
}
export const stopRealtimeHub = () => subscriber?.quit().catch(() => {});

export function sseHandler(req: Request, res: Response) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.write(`retry: 3000\nevent: ready\ndata: {}\n\n`);
  const client: Client = { user: req.user!, res };
  clients.add(client);
  const heartbeat = setInterval(() => res.write(`: ping\n\n`), 25_000);
  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(client);
  });
  logger.debug({ userId: req.user!.sub, clients: clients.size }, "sse connected");
}
