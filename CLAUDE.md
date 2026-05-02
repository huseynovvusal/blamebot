# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # start dev server (localhost:3000)
pnpm build        # production build
pnpm lint         # eslint
```

Seed demo data after starting dev server:
```bash
curl -X POST http://localhost:3000/api/seed
```

No test suite exists — the project was built for a hackathon.

## Architecture

Next.js 16 App Router, React 19, Tailwind v4, shadcn/ui, Upstash Redis, Vercel AI SDK 6 + Claude Sonnet (`anthropic/claude-sonnet-4-5`).

### Core: Incident Pipeline (`lib/pipeline/`)

All three webhook receivers (`/api/webhooks/vercel|sentry|uptime`) call `processIncident(raw)` in `lib/pipeline/index.ts`. The pipeline runs sequentially:

1. **normalize** — converts raw webhook payload into a standard seed
2. **enrich** — fetches commit SHA, PR, and changed files via GitHub (Octokit)
3. **owners** — matches changed files against glob-pattern owner rules from Redis
4. **severity** — applies rule-based classification (P1/P2/P3)
5. **history** — searches Redis `byFile` indices for similar incidents (last 30 days)
6. **ai** — calls Claude via Vercel AI SDK with `Output.object()` for structured reports; falls back to heuristics on failure
7. **persist** — writes to Redis using pipeline (`kv.incidents.put`)
8. **devscore** — increments `caused` counter for responsible devs
9. **slack post** — sends Block Kit message; mirrors `slackThreadTs` back into the incident
10. **escalation** — schedules a timed entry in `escalations:pending` sorted set

### Storage (`lib/kv.ts`)

Single file exports a `kv` object with namespaces: `incidents`, `config`, `devscores`, `postmortems`, `escalations`, `credentials`. All config namespaces fall back to hardcoded defaults when Redis has no value. Incident indices are Redis sorted sets keyed by `createdAt` timestamp — used for `byFile`, `bySeverity`, `byService`, and `byDev` lookups.

### Slack (`lib/slack/`)

- `client.ts` — thin Slack Web API wrapper
- `blocks.ts` — Block Kit message builders
- `post.ts` — posts incident report, mirrors thread TS, handles escalations
- `lookup.ts` — resolves Slack user info

Slack interactivity (`/api/slack/interactivity`) handles button actions: `rollback`, `hotfix`, `autopilot`, `resolve`. All Slack endpoints verify HMAC signatures via `lib/hmac.ts`.

### Webhook Verification (`lib/hmac.ts`)

Edge-runtime-safe Web Crypto API helpers. Each source has its own signature scheme:
- **Vercel**: SHA-1 HMAC of raw body, `x-vercel-signature` header
- **Sentry**: SHA-256 HMAC, `sentry-hook-signature` header
- **UptimeRobot**: shared secret via `x-uptime-secret` header (no HMAC)
- **Slack**: `v0:{ts}:{body}` SHA-256 with 5-minute replay window

### AI (`lib/pipeline/ai.ts`)

Uses Vercel AI SDK `generateText` + `Output.object()` for structured output (Zod schemas in `lib/schemas.ts`). Three AI functions:
- `generateIncidentReport` — root cause, blast radius, recommended action
- `generatePostmortem` — blameless postmortem from timeline events
- `parseNLConfig` — translates plain English into config patches (used by `/api/config/nl`)

All three have heuristic fallbacks if the AI call fails.

### Cron (`/api/cron/escalations`)

Vercel cron runs every 5 minutes. Drains the `escalations:pending` sorted set, checks if unacknowledged, pages escalation contacts via Slack. Protected by `CRON_SECRET` bearer token.

### Auth / Middleware

`middleware.ts` is currently passthrough (demo mode). Admin routes (`/api/admin/`) use HMAC-signed cookies via `lib/admin-auth.ts`. `ADMIN_TOKEN` and `ADMIN_COOKIE_SECRET` env vars gate access.

## Key Env Vars

```
KV_REST_API_URL / UPSTASH_REDIS_REST_URL
KV_REST_API_TOKEN / UPSTASH_REDIS_REST_TOKEN
SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_INCIDENTS_CHANNEL_ID
GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO
VERCEL_API_TOKEN, VERCEL_PROJECT_ID
VERCEL_WEBHOOK_SECRET, SENTRY_WEBHOOK_SECRET, UPTIMEROBOT_WEBHOOK_SECRET
ADMIN_TOKEN, ADMIN_COOKIE_SECRET, CRON_SECRET
```

## UI Structure

Pages in `app/` are thin wrappers; logic lives in `components/`:
- `components/dashboard/` — live feed, stats, top offenders, activity feed
- `components/incidents/` — list view and detail view with timeline
- `components/config/` — per-config-section forms (owners, severity, escalation, blackout, autopilot, NL)
- `components/analytics/` — recharts graphs, heatmap, leaderboard

`components/app-shell.tsx` is the top-level layout with sidebar navigation. Data fetching uses SWR (`lib/fetcher.ts`).
