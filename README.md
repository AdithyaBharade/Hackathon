# Algohire Hackathon (21 Nov 2026)

| App | Path | Port | Stack |
|-----|------|------|-------|
| Frontend | `fe/` | 5173 | Vite + React 19 + TS, React Router 7, TanStack Query, Zustand, React Hook Form + Zod, Tailwind 4, shadcn/ui (all), AG Grid, axios |
| Backend | `be/` | 8000 | Express 5 + TS, Prisma 7 (Neon Postgres), Zod, JWT + bcrypt, pino logging, Redis (ioredis) cache, BullMQ queue + worker, rate limiting |

## Run locally
```bash
cd be && npm run dev          # API  -> http://localhost:8000/api
cd be && npm run dev:worker   # BullMQ worker (needs Redis)
cd fe && npm run dev          # Web  -> http://localhost:5173
```
Redis is optional in dev: without it the API still works (cache is skipped, jobs are not enqueued, `/api/health` shows `redis: disconnected`).
Full stack in Docker: `docker compose up --build` (redis + api + worker + web).

## Backend
- `npm run db:migrate -- --name <name>` then `npm run db:generate` after editing `prisma/schema.prisma`
- `npm run db:studio` to browse the DB
- Postman: import `be/postman_collection.json` (Register/Login auto-save the token)

```
be/src
├─ config/        env (zod-validated), prisma, redis, logger
├─ routes/        URL -> middleware -> controller
├─ controllers/   req/res only
├─ services/      business logic + DB access
├─ validators/    zod schemas for request bodies
├─ middlewares/   auth (JWT, roles), validate, errorHandler
├─ jobs/          queues/ (producers) + workers/ (consumers)
├─ utils/         ApiError, asyncHandler, response, jwt, cache
├─ server.ts      API entry       worker.ts  worker entry
```

## Frontend
```
fe/src
├─ app/           router.tsx + routes/ (thin: each route only renders a component)
├─ components/    ui/ (shadcn), common/, layout/, <feature>/
├─ services/      api/ (axios client, endpoints, query keys) + <feature>/ (*.service.ts, *.queries.ts)
├─ store/         zustand stores
├─ schemas/       zod schemas for forms
├─ types/  providers/  lib/  hooks/  constants/
```

## Adding a feature (e.g. `jobs`)
**BE:** model in `schema.prisma` -> migrate -> `validators/job.validator.ts` -> `services/job.service.ts` -> `controllers/job.controller.ts` -> `routes/job.routes.ts` -> register in `routes/index.ts`
**FE:** `types/job.ts` -> `schemas/job.schema.ts` -> `services/api/endpoints.ts` + `query-keys.ts` -> `services/jobs/jobs.service.ts` + `jobs.queries.ts` -> `components/jobs/*.tsx` -> `app/routes/jobs.tsx` -> add to `app/router.tsx`
