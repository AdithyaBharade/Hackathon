# CLAUDE.md

**Read and follow [rules.md](rules.md) for every change.** It is the source of truth for UI, API, structure and backend conventions.
The `users` feature (fe + be) is the reference implementation. Copy its patterns.

## Commands
| | Dev | Build / check |
|---|---|---|
| Backend (`be/`, :8000) | `npm run dev` · worker: `npm run dev:worker` | `npm run build` |
| Frontend (`fe/`, :5173) | `npm run dev` | `npm run build` |
| DB | `npm run db:migrate -- --name <x>` then `npm run db:generate` | `npm run db:studio` |

## Notes
- Ports 3000/4000/5000 are taken on this machine (other projects / AirPlay). Keep 5173 + 8000.
- shadcn components use **Base UI** (`render` prop, not `asChild`).
- Prisma 7: client is generated to `be/src/generated/prisma`; `migrate dev` does not auto-generate.
- Redis is optional in dev; the API degrades gracefully without it.
- Before finishing: `npm run build` must pass in both `fe/` and `be/`.
