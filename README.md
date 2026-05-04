# BlameBot — AI-Powered Incident Intelligence

![BlameBot](./assets/image.png)

> **Vercel Zero to Agent Hackathon submission** · Solo · Deployed on Vercel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)](https://blamebot.vercel.app)
[![Built with Next.js](https://img.shields.io/badge/Built_with-Next.js-black?logo=next.js)](https://nextjs.org/)
[![Upstash Redis](https://img.shields.io/badge/Database-Upstash_Redis-red)](https://upstash.com)
[![AI by Claude](https://img.shields.io/badge/AI-Claude_3.5_Sonnet-purple)](https://anthropic.com)

BlameBot is an autonomous on-call agent that closes the loop from deploy failure to resolved incident — without waking up your whole team at 3 AM. It ingests alerts from Vercel, Sentry, and UptimeRobot, uses AI to explain what broke and who owns it, pages the right person via Slack, and can roll back the deployment automatically.

**[Live Demo](https://blamebot.huseynovvusal.dev)** · **[GitHub](https://github.com/huseynovvusal/blamebot)**

---

## Table of Contents
- [The Problem](#the-problem)
- [Built for Vercel Zero to Agent Hackathon](#built-for-vercel-zero-to-agent-hackathon)
- [How It Works](#how-it-works)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Webhook Setup](#webhook-setup)
- [Slack App Setup](#slack-app-setup)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## The Problem

Every on-call rotation has the same failure loop:

1. Alert fires at 2 AM
2. Engineer scrambles to find the right Slack thread, the right commit, the right person
3. 40 minutes later: "oh it was that one deploy"
4. Team manually writes a postmortem (or doesn't)

BlameBot collapses that 40-minute scramble into a 10-second AI summary with one-click rollback.

---

## Built for Vercel Zero to Agent Hackathon

This project was built as a solo submission for the [Vercel Zero to Agent Hackathon](https://community.vercel.com/hackathons/zero-to-agent) (April 24 – May 4, 2026).

**Why BlameBot fits the "Zero to Agent" theme:**

- It is a genuine autonomous agent, not a chatbot. It receives a signal, reasons about it, takes action, and reports back — all without human involvement.
- The agent loop spans multiple tools: GitHub for code context, Vercel API for rollback actions, Slack for communication, and Claude for reasoning.
- Autopilot mode lets it close the full loop: detect → analyze → act → report — zero human steps required.

---

## How It Works

```mermaid
flowchart TD
    %% Styling
    classDef webhook fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b
    classDef pipeline fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    classDef db fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    classDef ai fill:#ffebee,stroke:#d32f2f,stroke-width:2px,color:#b71c1c
    classDef slack fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
    classDef ui fill:#eceff1,stroke:#455a64,stroke-width:2px,color:#263238

    %% Triggers
    subgraph Triggers ["External Events (Webhooks)"]
        direction LR
        Vercel([Vercel Deploy]):::webhook
        Sentry([Sentry Error]):::webhook
        Uptime([UptimeRobot]):::webhook
    end

    %% Pipeline
    subgraph Core ["Incident Pipeline (Orchestrator)"]
        direction TB
        N["1. Normalize Payload"]:::pipeline
        E["2. Enrich with GitHub Data<br/>(Commits, PRs, Files)"]:::pipeline
        R["3. Resolve Code Owners"]:::pipeline
        Sev["4. Decide Severity"]:::pipeline
        H["5. Find Similar Incidents"]:::pipeline
        AI["6. Claude Sonnet AI Report<br/>(Root Cause, Blast Radius)"]:::ai
        P[("7. Persist to Redis")]:::db
        Dev["8. Update Developer Scores"]:::pipeline
        S["9. Post to Slack Channel"]:::slack
        Esc["10. Schedule Escalation"]:::pipeline
        Health["11. Update Integration Health"]:::pipeline

        N --> E --> R --> Sev --> H --> AI --> P --> Dev --> S --> Esc --> Health
    end

    %% Routing
    Vercel --> N
    Sentry --> N
    Uptime --> N

    %% UI & Actions
    subgraph Presentation ["Interaction & Presentation"]
        direction TB
        SlackMsg["Slack Block Kit Alert<br/>Action Buttons: Acknowledge, Rollback, Hotfix"]:::slack
        Dash["Next.js Dashboard<br/>Analytics, Trends & Postmortems"]:::ui
    end

    S --> SlackMsg
    P -.-> Dash
    SlackMsg -.-> Dash

    %% Styling adjustments
    style Triggers fill:transparent,stroke:#999,stroke-width:1px,stroke-dasharray: 5 5
    style Core fill:transparent,stroke:#f57c00,stroke-width:2px
    style Presentation fill:transparent,stroke:#455a64,stroke-width:1px,stroke-dasharray: 5 5
```

### Pipeline Steps

| Step | What happens |
|---|---|
| **Normalize** | Converts raw webhook payloads into a standard incident format |
| **Enrich** | Fetches commit SHA, PR info, and changed file list from GitHub |
| **Resolve Owners** | Matches changed files against glob-pattern ownership rules |
| **Decide Severity** | Applies configurable rules (site-down = critical, etc.) |
| **Find Similar** | Queries Redis for incidents on the same files in the last 30 days |
| **AI Report** | Claude Sonnet generates root cause, blast radius, recommended action |
| **Persist** | Saves incident + timeline to Upstash Redis |
| **Dev Scores** | Updates reliability scores for responsible developers |
| **Post to Slack** | Sends rich Block Kit message to your incidents channel |
| **Schedule Escalation** | Sets up timed escalation if incident goes unacknowledged |
| **Health Check** | Stamps the last-seen time for the integration source |

---

## Features

### Live Dashboard
- Active incident count with severity breakdown
- Real-time incident feed
- Integration health status (Vercel, Sentry, UptimeRobot)
- Top offenders — developers causing the most incidents
- Activity feed across all ongoing incidents

### AI-Powered Incident Reports
- Root cause analysis written in plain English
- Blast radius assessment (affected services, users, regions)
- Recommended action (rollback, hotfix, monitor)
- Automatic similarity detection against recent incidents
- One-click postmortem generation

### Slack-First Response
- Rich Block Kit incident cards with all context in one message
- Acknowledge / Rollback / Draft Hotfix PR buttons
- Thread-based timeline updates
- Escalation alerts when incidents go unacknowledged

### Analytics
- Incident trends over time charted by severity
- MTTR (Mean Time to Resolution) tracking
- Top problematic files and services
- Developer reliability scores and leaderboard
- Risk heatmap — incidents by day of week and hour
- Service health scores

### Configuration Panel
- **Owner Rules** — file glob → Slack user/group mapping
- **Severity Rules** — pattern-based auto-classification
- **Escalation Policy** — per-severity delay and escalation contacts
- **Blackout Windows** — timezone-aware quiet hours with fallback contact
- **Autopilot** — auto-rollback thresholds per severity level
- **Natural Language Config** — update any setting in plain English via AI

### Autopilot Mode
When enabled, BlameBot can automatically roll back a failing deployment via the Vercel API without any human intervention. Configurable per severity level with a confirmation grace window.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| AI | Vercel AI SDK 6, Claude Sonnet (Anthropic) — chosen over OpenAI for superior technical root cause reasoning |
| Database | Upstash Redis |
| Integrations | Vercel API, GitHub (Octokit), Slack |
| Charts | Recharts |
| Deployment | Vercel (with Cron Jobs) |

---

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Upstash Redis instance
- Vercel project
- Slack app (bot token + signing secret)
- GitHub personal access token

### 1. Clone and install

```bash
git clone https://github.com/VusalHuseynov/blamebot
cd blamebot
pnpm install
```

### 2. Configure environment variables

Create `.env.local` in the project root:

```bash
# ── App ────────────────────────────────────────────────
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Upstash Redis ───────────────────────────────────────
# Create a database at https://console.upstash.com
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token
KV_REST_API_URL=https://your-db.upstash.io
KV_REST_API_TOKEN=your_token

# ── GitHub ──────────────────────────────────────────────
# PAT with repo + read:org scopes
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=your-org-or-username
GITHUB_REPO=your-repo-name
# For GitHub OAuth (optional)
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=your_secret

# ── Slack ───────────────────────────────────────────────
# Create an app at https://api.slack.com/apps
SLACK_BOT_TOKEN=xoxb-xxxxxxxxxxxx
SLACK_SIGNING_SECRET=your_signing_secret
SLACK_INCIDENTS_CHANNEL_ID=C0XXXXXXXXX
# For Slack OAuth (optional)
SLACK_CLIENT_ID=your_client_id
SLACK_CLIENT_SECRET=your_client_secret

# ── Vercel ──────────────────────────────────────────────
# API token from https://vercel.com/account/tokens
VERCEL_API_TOKEN=your_vercel_token
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxx
# VERCEL_TEAM_ID only needed for team projects
VERCEL_TEAM_ID=team_xxxxxxxxxxxx

# ── Webhook secrets ─────────────────────────────────────
# Generate with: openssl rand -hex 32
VERCEL_WEBHOOK_SECRET=your_secret
SENTRY_WEBHOOK_SECRET=your_secret
UPTIMEROBOT_WEBHOOK_SECRET=your_secret

# ── Admin ───────────────────────────────────────────────
ADMIN_TOKEN=your_admin_token
ADMIN_COOKIE_SECRET=your_cookie_secret

# ── Cron ────────────────────────────────────────────────
CRON_SECRET=your_cron_secret
```

### 3. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Seed demo data (optional)

```bash
curl -X POST http://localhost:3000/api/seed
```

This populates Redis with sample incidents, timeline events, and developer scores so the dashboard is populated immediately.

---

## Webhook Setup

Point these services at your deployed URL:

### Vercel
Settings → Webhooks → Add webhook
```
URL: https://your-app.vercel.app/api/webhooks/vercel
Events: deployment.error, deployment.canceled
```

### Sentry
Project Settings → Developer Settings → Internal Integration → Webhooks
```
URL: https://your-app.vercel.app/api/webhooks/sentry
Events: issue (created, resolved)
```

### UptimeRobot
My Settings → Alert Contacts → Add Alert Contact
```
Type: Web-hook
URL: https://your-app.vercel.app/api/webhooks/uptime
```

All webhook endpoints validate HMAC signatures. Set the corresponding `*_WEBHOOK_SECRET` env vars to match what each service sends.

---

## Slack App Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create New App → From manifest

2. Use this manifest:

```yaml
display_information:
  name: BlameBot
  description: AI-powered incident intelligence
features:
  bot_user:
    display_name: BlameBot
    always_online: true
  slash_commands:
    - command: /incident
      url: https://your-app.vercel.app/api/slack/commands
      description: Query BlameBot about incidents
  interactivity:
    is_enabled: true
    request_url: https://your-app.vercel.app/api/slack/interactivity
oauth_config:
  scopes:
    bot:
      - chat:write
      - channels:history
      - channels:read
      - commands
settings:
  event_subscriptions:
    request_url: https://your-app.vercel.app/api/slack/events
    bot_events:
      - message.channels
```

3. Install to workspace, copy `Bot User OAuth Token` → `SLACK_BOT_TOKEN`
4. Copy Signing Secret → `SLACK_SIGNING_SECRET`

---

## Deployment

BlameBot is built for Vercel. Push to your repo and connect the project.

The included `vercel.json` configures the escalation cron:

```json
{
  "crons": [
    {
      "path": "/api/cron/escalations",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

> **Note:** Vercel Hobby accounts are limited to daily cron jobs. The repo ships with `0 0 * * *` (once per day) to stay within the free tier. Upgrade to Pro and change the schedule to `*/5 * * * *` for every-5-minute escalation checks.

Set all environment variables in the Vercel dashboard under Settings → Environment Variables.

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/incidents` | List incidents with optional status/severity filter |
| `POST` | `/api/incidents` | Create incident manually |
| `GET` | `/api/incidents/[id]` | Get single incident |
| `GET` | `/api/incidents/[id]/timeline` | Get incident timeline events |
| `GET/POST` | `/api/incidents/[id]/postmortem` | Get or generate AI postmortem |
| `POST` | `/api/webhooks/vercel` | Vercel deployment webhook |
| `POST` | `/api/webhooks/sentry` | Sentry error webhook |
| `POST` | `/api/webhooks/uptime` | UptimeRobot downtime webhook |
| `GET` | `/api/analytics` | Aggregated analytics data |
| `GET/PUT` | `/api/config/owners` | Owner rule configuration |
| `GET/PUT` | `/api/config/escalation` | Escalation policy |
| `GET/PUT` | `/api/config/severity` | Severity classification rules |
| `GET/PUT` | `/api/config/autopilot` | Autopilot settings |
| `GET/PUT` | `/api/config/blackout` | Blackout windows |
| `POST` | `/api/config/nl` | Natural language config update |
| `GET` | `/api/health` | Health check |

---

## Project Structure

```
blamebot/
├── app/
│   ├── (pages)/          # Next.js App Router pages
│   │   ├── dashboard/
│   │   ├── incidents/
│   │   ├── analytics/
│   │   └── config/
│   └── api/              # API routes
│       ├── webhooks/     # Webhook receivers
│       ├── incidents/    # Incident CRUD
│       ├── config/       # Configuration endpoints
│       ├── slack/        # Slack event/command/interactivity
│       ├── analytics/    # Analytics aggregation
│       └── cron/         # Scheduled jobs
├── lib/
│   ├── pipeline/         # Core incident processing
│   │   ├── index.ts      # Orchestrator
│   │   ├── normalize.ts  # Webhook normalization
│   │   ├── enrich.ts     # GitHub enrichment
│   │   ├── severity.ts   # Severity classification
│   │   ├── history.ts    # Similar incident search
│   │   ├── ai.ts         # Claude AI integration
│   │   ├── devscore.ts   # Developer scoring
│   │   └── actions.ts    # Rollback / hotfix actions
│   ├── schemas.ts        # Zod schemas
│   ├── types.ts          # TypeScript types
│   └── redis.ts          # Redis client
├── components/           # React components
└── vercel.json           # Cron job config
```

---

## Contributing

Contributions are welcome! Please check out the [Contributing Guidelines](CONTRIBUTING.md) for more details.

---

## License

[MIT](LICENSE)
