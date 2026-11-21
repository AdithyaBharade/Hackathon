# Local setup

This guide takes you from a fresh clone to a running system with demo data and passing tests.

## Option A: Docker only (recommended)

You need **Docker Desktop** (or Docker Engine with Compose v2) and about 4 GB of free disk space.

```bash
git clone https://github.com/AdithyaBharade/Hackathon.git certiflow
cd certiflow
docker compose up --build
```

The first build takes a few minutes. When `api` reports healthy, everything is up:

| What | URL |
|---|---|
| App | http://localhost:5173 |
| Public verification (no login) | http://localhost:5173/verify |
| API health | http://localhost:8000/api/health |
| WhatsApp stand-in: what reached each phone | http://localhost:8100/v1/inbox |
| WhatsApp stand-in: failure statistics | http://localhost:8100/v1/stats |

Compose starts Postgres, Redis, a one-shot `migrate` step (runs migrations, then seeds demo data), the API, **two** workers, the WhatsApp stand-in and the web app. To run more workers: `docker compose up --scale worker=4`.

### Run the tests

```bash
docker compose --profile test run --rm tests
```

This runs all 38 integration tests against a separate `certiflow_test` database in the same Postgres container, using real Redis. Expect `Tests 38 passed`.

### Reset demo data

```bash
docker compose down -v        # deletes the database, queues and generated PDFs
docker compose up --build
```

## Demo people

On the login page, click a person to sign in. Every password is `Demo@1234`.

| Person | Role | Email |
|---|---|---|
| Anika | Training centre (Pune) | anika@centre.demo |
| Dev, Meera, Kabir | District officers (Pune) | dev@ / meera@ / kabir@district.demo |
| Neha | Quality team | neha@quality.demo |
| Farah | State office | farah@state.demo |
| Sameer | District officer in **Nashik**, to show district isolation | sameer@nashik.demo |

Seeded batches (all from Anika's centre):

| Batch | State | Try |
|---|---|---|
| Electrician (Domestic) | District review, 0 of 2 | Open as Dev and Meera in two browsers and approve at the same time |
| Field Technician - AC | District review, Dev approved | Meera or Kabir completes the quorum; Dev can withdraw |
| Data Entry Operator (60) | Quality review | Neha approves, then Farah gives final approval, and 60 certificates go out |
| Beauty Therapist | State approval | Farah approves |
| Welding Technician | Waiting 3 days | Escalated to Farah within about 15 s |
| Tailoring | Sent back | Anika fixes and resends; approvals reset |
| Solar PV Installer | Approved | Certificates already issued and delivered |
| Retail Sales Associate | Draft | Anika uploads a sheet |

Sample spreadsheets are in [`be/samples/`](be/samples/):
- `candidates-with-errors.csv` (4 bad rows)
- `candidates-valid-12.csv`
- `candidates-big-60.csv`

## Option B: run the code on your machine (for development)

You need Node 22+ and Docker (only for Postgres and Redis).

```bash
docker compose up -d postgres redis            # host ports 5433 and 6380

cd be
cp .env.example .env                            # then set JWT_ACCESS_SECRET and CERT_LINK_SECRET (openssl rand -hex 32)
npm install
npx prisma migrate deploy
npm run db:seed                                 # add -- --reset to start over
npm run dev            # API      :8000
npm run dev:worker     # workers  (new terminal)
npm run dev:whatsapp   # stand-in :8100 (new terminal)
npm test               # tests (uses certiflow_test on :5433)

cd ../fe
npm install
npm run dev            # web      :5173
```

## Troubleshooting
- **A port is already in use** (5173, 8000, 8100, 5433 or 6380): stop whatever holds it, or change the left-hand side of `ports:` in `docker-compose.yml`.
- **`read-only file system` or `no space left on device` from Docker:** your disk is full. Free space and restart Docker Desktop.
- **Logged in but the screen is empty after switching people:** do a hard refresh. Each login clears cached data, but an old tab may still hold the previous person's session.
