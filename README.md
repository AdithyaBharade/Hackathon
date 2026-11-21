# CertiFlow: Skilling Certificate Issuance

Training centres upload passed batches. District officers, the quality team and the state office approve them. Every candidate gets their certificate on WhatsApp, and anyone can check that a certificate is genuine without logging in.

- **Run it:** `docker compose up --build`, then open http://localhost:5173 and click a person. Full guide: [SETUP.md](SETUP.md)
- **Production plan:** [DEPLOYMENT.md](DEPLOYMENT.md)
- **Tests:** 38 integration tests against real Postgres and Redis. Run them with `docker compose --profile test run --rm tests`

---

## 1. Requirements note

### What I understood the problem to be
Today it takes weeks to certify a batch, approvals happen on WhatsApp with no record, and nobody can check whether a certificate is real. The platform must therefore:
1. Make the **path from upload to phone fast**, with no clerk in the loop.
2. Record **every decision** with who made it and when.
3. Make **forgeries detectable** by anyone in seconds.
4. **Surface delays** without anyone having to chase them.

### Users and what each can do

| Who | Can | Cannot |
|---|---|---|
| **Training centre** (Anika) | Create a batch, upload candidates (CSV/XLSX), send for approval, see progress live, fix and resend when sent back | See other centres' batches; change a batch once it is under review |
| **District officer** (Dev, Meera, Kabir) | See batches from centres **in their district**, approve / send back / reject with a reason, withdraw their own approval while the stage is open | Act on other districts (they don't even see them); count twice towards the quorum; act at quality or state stage |
| **Quality team** (Neha) | Review **large batches** after the district and before the state | Act at district or state stage |
| **State office** (Farah) | Final approval, see stuck batches and alerts, **revoke** a certificate, resend a failed delivery | Act at district or quality stage |
| **Candidate** | Receive the certificate on WhatsApp with a download link | Log in (no account needed) |
| **Employer / public** | Check a certificate by number or QR code | See the holder's phone, date of birth or full name |

### Decisions where the brief was unclear

| Question | Decision | Why |
|---|---|---|
| "A district decision needs more than one officer" | **2 different officers** of the batch's district must approve (configurable: `DISTRICT_QUORUM`). **One** send-back or reject stops it. | Two approvals is the smallest "more than one". A single veto is safer than majority voting for certificates. |
| "Big batches need extra scrutiny" | **More than 50 candidates** (`BIG_BATCH_THRESHOLD`) go to the quality team after the district and before the state. | 50 matches a typical classroom. Bigger batches are where bulk fraud would hide. |
| Reject vs send back | **Send back** = fixable, the centre resends. **Reject** = final, the centre must create a new batch. A reason is mandatory for both. | Both outcomes appear in the brief. A reason makes the decision traceable and actionable. |
| **What happens to approvals when a batch is resent** (moment 6) | **They are reset.** Each submission is a new *version*; decisions belong to one version. The resent batch starts again at district review, and the old decisions stay on record. | The centre may have changed any row, so an approval of version 1 says nothing about version 2. Keeping old approvals would let changed data through unreviewed. |
| "Officers make mistakes and should be able to fix them" | An officer can **withdraw their own approval** while the stage is still open. After a stage completes, the fix is a **send back** from a later stage, or a **revocation** by the state office after issue. | A decision that has already moved the batch can't be silently undone. The correction must itself be a recorded decision. |
| When is a batch "stuck"? | Waiting at one stage longer than `STUCK_AFTER_MINUTES` (48 h in production, **2 minutes in the demo**). The state office gets an alert, the district officers get a notification, and it is logged once per stage. | "Someone senior finds out" = the state office. Escalating once per stage avoids alert spam. |
| Cancel a certificate | **State office only**, with a reason. Verification says **REVOKED** immediately and the download link stops working. | The brief gives the state "anything that goes wrong". |
| What verification shows | Valid/revoked, number, **masked name** ("An*** Ra*"), course, grade, centre, district, issue date. | Enough for an employer to match the paper, not enough to harvest personal data. |
| How a candidate downloads | The WhatsApp message carries a **signed link** (HMAC of the certificate id). There's no candidate login. | Knowing a certificate number (printed on the paper) must not be enough to download someone's certificate. |
| Duplicate candidates | Same mobile twice in one sheet = error. A mobile that already holds a valid certificate **for the same course** = error. | "A candidate getting two certificates" must never happen, including across batches. |
| Accounts | Provisioned by the programme office (seeded for the demo). **No self-registration.** | A role decides what a user may approve, so self-signup would be a hole. |

### The six moments and where they are proven

| Moment | How it works | Test |
|---|---|---|
| 1. Bad rows in a spreadsheet | Every row is validated first. Any error → `400` with `{row, field, message}` for **every** problem, and **nothing** is written. Valid sheets replace the list in one transaction. | [`01-upload.test.ts`](be/test/01-upload.test.ts) |
| 2. Two officers approve at once | Decisions take a **row lock** on the batch (`SELECT … FOR UPDATE`). A unique key `(batch, version, stage, officer)` stops double counting, and the stage advances only from the expected status. | [`02-approvals.test.ts`](be/test/02-approvals.test.ts): 2- and 3-way races, the same officer ×3 in parallel |
| 3. 60 candidates, unreliable WhatsApp | Unique `candidateId` on certificates. Numbers from a **Postgres sequence**. Approval → **outbox** → queue → one delivery job per certificate, retried with capped, jittered backoff. Each send carries an **idempotency key**. | [`03-issuance.test.ts`](be/test/03-issuance.test.ts): provider fails 30% and *times out after delivering* 20%. Asserts 60 certificates, 60 distinct numbers and **exactly 60 messages on 60 phones** |
| 4. Revoke, then an employer checks | Revocation is a conditional update. It **deletes the cached verification result** right away (and the cache TTL is only 30 s). | [`04-revoke-verify.test.ts`](be/test/04-revoke-verify.test.ts) warms the cache first, then revokes |
| 5. Batch sits too long | A repeatable job (every 15 s in the demo) escalates with `UPDATE … WHERE escalatedAt IS NULL`, so many workers still escalate exactly once. It re-arms when the batch moves. | [`05-escalation.test.ts`](be/test/05-escalation.test.ts) |
| 6. Sent back, fixed, resent | Versioned decisions (see above). | [`06-resubmit.test.ts`](be/test/06-resubmit.test.ts) |

"Never happen" rules have their own tests: wrong role or stage (`403`), another district (`404`, so the batch's existence isn't revealed), a forged or `alg:none` JWT (`401`), an `actorId` smuggled into the body (ignored; the actor always comes from the token), a stale version (`409`), revoked shown as genuine, PDF download without a valid signature (`403`), and personal data in the public response.

---

## 2. How it is put together

```
 Browser (React + Vite)                      Employer / QR scan
   │  REST (httpOnly cookie)  ▲ SSE                │ GET /public/verify/:no (no login, rate-limited)
   ▼                          │                    ▼
 ┌──────────────── API (Express, stateless, N instances) ─────────────────┐
 │ route → zod validate → authenticate → authorize(role) → controller →   │
 │ service (scope checks, row locks) → Prisma ──► PostgreSQL              │
 │   writes state change + audit row + OUTBOX row in ONE transaction      │
 │ SSE hub ◄── Redis pub/sub ◄────────────────────────────┐               │
 └────────────────────────────────────────────────────────┼───────────────┘
                                                          │
 ┌──────────────── Worker (N instances) ──────────────────┼───────────────┐
 │ outbox relay (FOR UPDATE SKIP LOCKED) ──► BullMQ queues + pub/sub      │
 │ issuance:    approved batch → certificates (idempotent) → delivery jobs│
 │ delivery:    render PDF (atomic write) → WhatsApp (idempotency key)    │
 │              retries: capped exponential + jitter; final fail → alert  │
 │ maintenance: stuck-batch check (repeatable job)                        │
 └──────────────────────────────────────────┬─────────────────────────────┘
                                            ▼
                               WhatsApp stand-in (separate container:
                               fails, times out, honours idempotency keys)
```

**Batch lifecycle:** `DRAFT → PENDING_DISTRICT (2 officers) → [PENDING_QUALITY if > 50] → PENDING_STATE → APPROVED`, with `SENT_BACK` (back to the centre, then resubmitted as a new version) and `REJECTED` (final) reachable from any review stage. The rules live in one file, [`be/src/domain/workflow.ts`](be/src/domain/workflow.ts).

### Code map

| Path | What |
|---|---|
| `be/src/domain/workflow.ts` | Pure workflow rules (stages, quorum, next status) |
| `be/src/services/batch.service.ts` | Create, upload, submit, decide (row-locked), withdraw, scoping |
| `be/src/services/certificate.service.ts` | Issue (idempotent), deliver, revoke, verify, signed download |
| `be/src/services/escalation.service.ts` | Stuck-batch detection |
| `be/src/jobs/outbox-relay.ts` | Transactional outbox → queue / realtime |
| `be/src/jobs/workers/index.ts` | BullMQ workers (issuance, delivery, maintenance) |
| `be/src/lib/` | Spreadsheet parsing, PDF, WhatsApp client, signing, audit, SSE hub |
| `be/src/mock/whatsapp-provider.ts` | The misbehaving WhatsApp stand-in |
| `be/prisma/schema.prisma` | Data model; the DB enforces the uniqueness guarantees |
| `be/test/` | Integration tests, one file per moment |
| `fe/src/components/` | `batches/`, `certificates/`, `verify/`, `dashboard/` |

---

## 3. Key technical decisions

| Decision | Why | Trade-off |
|---|---|---|
| **Correctness guarantees in Postgres**, not app code: unique `(candidateId)`, unique `number` from a sequence, unique `(batch, version, stage, actor)`, row lock per decision | App-level checks race between instances. The database is the one place every instance shares. | Row lock serialises decisions *on one batch*, which is fine because there are a handful of officers per batch. |
| **Transactional outbox** for "batch approved" | If the API committed the approval and then crashed (or Redis blipped) before enqueuing, candidates would never get certificates. The event row commits with the approval, and the relay retries until it's queued. | ~0.5 s extra latency, and a polling relay. Acceptable for this flow. |
| **BullMQ on Redis** as the queue | Already need Redis for cache and pub/sub. Gives retries, backoff, delayed jobs, rate limiting, repeatable jobs and stalled-job recovery (a crashed worker's job is picked up by another). | Redis is now critical: run it with AOF persistence (on in compose) and managed HA in production. Kafka/SQS would be overkill at 30k jobs/hour. |
| **Idempotent jobs everywhere** (issue: `ON CONFLICT DO NOTHING`; deliver: skip if `SENT`; PDF: temp file + rename; provider: idempotency key) | Queues deliver *at least once*. Duplicates must be harmless, not prevented. | Relies on the provider honouring the key; see Known limitations. |
| **Redis** used for: queues, realtime pub/sub, verify cache | Public verification arrives in bursts, and a cache absorbs them. Revocation deletes the key, and the short TTL bounds staleness if that delete ever fails. | The app works with Redis down (cache falls back to the DB). Queues pause and resume. |
| **SSE** (not WebSockets) for live updates | One-way server → browser is all we need. Works through proxies, reconnects by itself, uses the auth cookie. Events say *what* changed and the browser refetches through normal access-checked endpoints, so the stream can't leak data. | Long-lived connections per user. Fine at 10k DAU behind a load balancer with idle timeouts raised. |
| **Stateless API, scope from the signed token** (role, district, centre) | Any instance can serve any request and restart at any time. | A reassigned officer keeps their old scope until the 15-minute token expires. |
| **httpOnly cookies + refresh-token rotation** (kept from the template, with reuse detection) | Tokens are unreadable by JS (XSS-safe). A stolen refresh token used twice kills every session. | Needs CORS/cookie care across domains. |
| **No self-registration; removed the template's open `/users` CRUD** | Any logged-in user could edit or delete any user. | Accounts are seeded; a user-admin screen is a next step. |
| **Versioned approvals** | See moment 6. | Officers re-review every resubmission. |

### Security summary
- **Authentication:** JWT in an httpOnly cookie, HS256 pinned (`alg:none` and other algorithms rejected), 15-minute expiry, rotating refresh tokens.
- **Authorisation:** checked twice. The route says which role may call it, and the service applies a **data scope** (centre / district) to every read and write. Out-of-scope rows return `404`, not `403`, so their existence isn't revealed.
- **Input:** every body, query and param goes through zod. File uploads are limited to 2 MB, `.csv`/`.xlsx` only, max 1000 rows. Certificate numbers are pattern-checked before reaching the DB.
- **Public endpoints** are rate-limited per IP. Verification exposes only masked data. Downloads need an HMAC signature, compared in constant time.
- **Personal data:** officers see mobiles masked and only the owning centre sees them in full. Logs redact cookies and authorization headers.

### Observability
- **Every state change writes an audit row in the same transaction** (who, role, when, request id, before → after). `GET /api/batches/:id/timeline` and the "Audit trail" card show a batch end to end: created → uploaded → each decision → stage changes → escalations → certificates issued. Each certificate has its own trail too (delivered with attempt count and provider message id, failed, resend, revoked).
- **Request ids** (`x-request-id`, accepted from a proxy or generated) appear in structured pino logs and in audit rows, and travel with the event into the issuance job. So one request can be followed from HTTP → DB → queue → worker logs.
- `GET /api/health` (DB and Redis), `GET /api/ops/queues` (queue depths, state office only), and the WhatsApp stand-in's `GET :8100/v1/stats` and `GET :8100/v1/inbox`.

---

## 4. AI usage

I used **Claude Code** as a pair programmer throughout: to turn the brief into the decisions table, draft the schema and services, write the tests, and draft the docs. How I checked its output:
- **The tests are the check.** Each moment and never-rule has an integration test against real Postgres and Redis, and the moment-3 test uses a deliberately hostile provider. Several AI-written first drafts failed the tests and were fixed:
  - A late officer got `403` instead of `409`.
  - The header row was counted as a "bad row".
  - Uncapped backoff made an outage take minutes to recover.
  - The "waiting for me" filter ignored the batch version.
- I read every line and can explain it. The [decisions table](#decisions-where-the-brief-was-unclear) records my own calls on the ambiguous parts of the brief.
- I ran the flows by hand end to end (login as each person, approve concurrently, watch the live updates, revoke and verify).

## 5. Known bugs, limitations and next steps
- **Real WhatsApp has no idempotency key.** Our stand-in honours one, which makes "timed out but delivered" safe. With Meta's Cloud API, a timeout after a successful send could produce a second message on retry. Next step: record the provider's message id from the delivery-status **webhook** and check status before retrying a timed-out send.
- The SSE connection is authorised when it opens. A user whose role changes keeps receiving *change notices* (not data) until they reconnect.
- The public rate limiter uses in-memory counters per instance. Use a Redis store when running several API instances.
- Duplicate detection across batches uses mobile + course name. A real identity key (e.g. a hashed Aadhaar or candidate registration ID) would be stronger.
- Download links don't expire, but stop working when revoked. Rotating `CERT_LINK_SECRET` invalidates all of them.
- Notifications can't be marked as read. There's no user-administration screen. XLSX reads the first sheet only.
- If Redis loses data despite AOF, jobs already relayed from the outbox are lost. A periodic **reconciliation sweep** (approved batches with missing or `PENDING` certificates older than N minutes → re-enqueue) is the next step. Re-running issuance already re-enqueues undelivered certificates.
- The frontend bundle isn't code-split yet (AG Grid is large).
