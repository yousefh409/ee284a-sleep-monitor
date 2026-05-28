# Web

Next.js 16 (App Router) + Tailwind + Postgres + MQTT subscriber + Claude API.

Single app on Railway: MQTT subscriber runs inside `instrumentation.ts`, REST API in `app/api/`, dashboard in `app/page.tsx`.

## Local dev

1. Copy `.env.local.example` to `.env.local` and fill in credentials.
2. `npm run dev` → open `http://localhost:3000`. Schema is auto-applied on first request via `instrumentation.ts` → `lib/migrate.ts`.
3. First load redirects to `/login`. Use the password from `DASHBOARD_PASSWORD`.

## Layout

| Path | Purpose |
|---|---|
| `instrumentation.ts` | Boots the MQTT subscriber on Node.js runtime start |
| `proxy.ts` | Password gate (redirects unauthenticated requests to `/login`) |
| `lib/db.ts` | Postgres connection pool |
| `lib/mqtt.ts` | MQTT subscriber + telemetry insert + wake detection + LLM trigger |
| `lib/claude.ts` | Anthropic SDK wrapper, prompt-cached system prompt |
| `lib/schema.ts` | Postgres schema as a TS const (inlined for production) |
| `lib/migrate.ts` | Runs `SCHEMA_SQL` once on server boot (idempotent) |
| `lib/types.ts` | Shared TypeScript types |
| `app/page.tsx` | Dashboard (live panel + AI briefing + sleep-stage band) |
| `app/login/page.tsx` | Password gate UI |
| `app/api/login/route.ts` | POST `/api/login` — sets the session cookie |
| `app/api/live/route.ts` | GET `/api/live` — last 10 minutes of telemetry |
| `app/api/nights/route.ts` | GET `/api/nights` — list of past nights |
| `app/api/nights/[id]/route.ts` | GET `/api/nights/:id` — full night detail + report |
| `scripts/pub-test.mjs` | Local debug: publishes a synthetic telemetry payload to MQTT |

## Deploy to Railway

1. Push to a GitHub repo.
2. Create a Railway project, point it at this repo's `web/` folder.
3. Add the Postgres add-on. `DATABASE_URL` is auto-injected.
4. Set the rest of the env vars from `.env.local.example`.
5. Schema is auto-applied at startup; no manual migration step.
