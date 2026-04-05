# AleCooks

AleCooks is a planner-first recipe app prototype for weekly menu planning.

## Current MVP

- Weekly planner with day cards for breakfast, lunch, and dinner
- Side-panel editing for each day
- Optional "Something sweet" field per day
- Recipe library with source links, notes, categories, and ingredients
- Shopping list snapshot generation from linked recipes
- Kitchen tablet preview for a single day view
- Single-owner username/password auth with Better Auth
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
