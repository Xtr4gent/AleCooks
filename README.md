# AleCooks

AleCooks is a planner-first recipe app prototype for weekly menu planning.

## Current MVP

- Weekly planner with day cards for breakfast, lunch, and dinner
- Side-panel editing for each day
- Optional "Something sweet" field per day
- Recipe library with source links, notes, categories, and ingredients
- Shopping list snapshot generation from linked recipes
- Kitchen tablet preview for a single day view
- Single-owner username/password auth with Better Auth at `/api/auth/*`
- Node + Express server foundation for Railway
- Prisma schema, generated client, and initial PostgreSQL migration
- Server-backed planner state for authenticated sessions

## Run It

```bash
npm install
cp .env.example .env
npm run dev
```

The Node server expects PostgreSQL-compatible `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and the owner credentials in `.env`.
In local development, AleCooks now creates the target Postgres database if it is missing and runs checked-in migrations before the server starts.
Default local ports are Vite on `5173+` and the AleCooks server on `3010` to avoid collisions with other apps already using `3000`.
In production, `DATABASE_URL` must be explicitly set. AleCooks no longer falls back to a local `127.0.0.1` Postgres URL outside development/test.
On Railway, `BETTER_AUTH_URL` can be derived automatically from `RAILWAY_PUBLIC_DOMAIN`, but `BETTER_AUTH_SECRET` still needs to be set manually in service variables.
Railway detection is based on Railway runtime env vars, not only `NODE_ENV`, so missing `NODE_ENV=production` will no longer cause a fallback to local Postgres.

## Checks

```bash
npm run lint
npm run build
```

## Database Commands

```bash
npm run db:generate
npm run db:migrate
npm run db:deploy
```

## Notes

- Public sign-up is disabled. AleCooks seeds exactly one owner account from `ALECOOKS_OWNER_*` env vars.
- Recipe import is lightweight in this first pass. Link parsing is not implemented yet.
- Shopping lists are stable snapshots and only change when you regenerate them.
- Railway should run `prisma migrate deploy` before `npm start`.
