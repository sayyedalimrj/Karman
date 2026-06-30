# Deployment

Karman is deploy-ready via environment variables, with **no hard-coded secrets**
anywhere in the codebase. This document covers configuration, database
provisioning, migrations, seeding, build/start, and the health check. It
documents **commands only** — it does not modify any server infrastructure.

> Environment variables are necessary but not sufficient: a working deployment
> also requires installed dependencies, an applied database migration, and a
> production build (see below).

## 1. Environment variables

Configure these in your deployment target (copy `.env.example` and replace the
placeholders). The application reads:

| Variable | Required | Used by | Notes |
|----------|----------|---------|-------|
| `NODE_ENV` | yes | `src/server/db.ts`, `src/server/auth/session.ts` | Use `production` in deployment. Controls cookie `secure` flag and Prisma logging. |
| `DATABASE_URL` | yes | `prisma/schema.prisma` | PostgreSQL connection string. |
| `SESSION_SECRET` | yes | `src/server/auth/session.ts` | HMAC key for session cookies; app fails fast if missing. |
| `NEXT_PUBLIC_APP_URL` | yes | `src/app/layout.tsx` | Absolute base URL for metadata/OG. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_NAME` / `SEED_ADMIN_PASSWORD` | optional | `prisma/seed.ts` | Initial admin bootstrap; safe fallbacks (random password printed once if unset). |
| `RUN_DB_TESTS` | optional | `vitest.config.ts` | Test-only: `1` enables DB-backed integration tests. |
| `FONT_RAR_PASSWORD` | optional | `scripts/extract-fonts.ts` | Local font-extraction tooling only; not needed at runtime. |

The app code does **not** read `PORT`/`HOSTNAME` directly. `next start` honors
the standard `PORT` env var (default `3000`) and `-p`/`-H` flags; set those at
the process/container level.

Never commit `.env` or `.env.production` — only `.env.example` is tracked.

### Generating a strong `SESSION_SECRET`

Generate a high-entropy random value and set it as `SESSION_SECRET` (do **not**
commit it). For example, a 48-byte base64 value from OpenSSL, or a 64-byte hex
value from Node's crypto, both work well. Treat the value like a password: store
it in your secret manager and rotate it if exposed.

## 2. Provision PostgreSQL

Provision a PostgreSQL database and set `DATABASE_URL` to point at it
(`postgresql://USER:PASSWORD@HOST:5432/karman?schema=public`). PostgreSQL is the
operational runtime database.

## 3. Install dependencies

```
npm ci
```

## 4. Apply database migrations

```
npx prisma migrate deploy
```

This applies the committed migrations in `prisma/migrations/` (initial schema +
the reference master-data migration). `prisma generate` also runs as part of
`npm run build`.

## 5. Seed the initial administrator

```
npm run seed
```

This creates **exactly one** initial `SYSTEM_ADMIN` user via the `Role` enum
(roles are a Prisma enum, **not** seeded rows). Provide `SEED_ADMIN_PASSWORD`
for non-interactive deploys; if omitted, a strong random password is generated
and printed once to stdout — capture it securely. The password is stored only
as a salted hash.

## 6. Build and start

```
npm run build      # runs `prisma generate` then `next build`
npm run start      # serves the production build (next start)
```

## 7. Health check

```
GET /api/health
```

Returns `200 { status: "ok", db: "up" }` when the process is up and the database
answers a `SELECT 1` connectivity probe; returns `503 { status: "error", db:
"down" }` when the DB check fails. The response never includes connection
strings, secrets, or internal error detail. Use it for readiness/liveness
probes.

## Verification commands (CI / pre-release)

The foundation is verified with:

```
npm run build
npm run lint
npx tsc --noEmit
npx prisma validate
npm run check:decimal     # enforces @db.Decimal(18,4) on monetary/reference numerics
npm test                  # unit + property tests (DB-free)
RUN_DB_TESTS=1 npm test   # additionally runs DB-backed integration tests
```

## Notes on server infrastructure

Reverse proxies (e.g. nginx), process supervisors (e.g. systemd), TLS
termination, backups, and host paths are deployment-environment concerns and are
intentionally **not** configured by this repository. Provision them per your
operations standards; Karman only requires the environment variables above, an
applied migration, and a production build.
