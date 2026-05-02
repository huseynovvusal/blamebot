import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { incidentId, eventId, messageId } from "@/lib/ids"
import type { AIReport, Incident, Owner, Severity, OwnerRule } from "@/lib/types"
import { isAdminFromCookies } from "@/lib/admin-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEMO_DEVS: Owner[] = [
  { slackUserId: "U_SARAH", name: "Sarah Chen" },
  { slackUserId: "U_MAYA", name: "Maya Patel" },
  { slackUserId: "U_DIEGO", name: "Diego Alvarez" },
  { slackUserId: "U_JEN", name: "Jen Park" },
  { slackUserId: "U_TOM", name: "Tom Becker" },
]

const DEMO_OWNERS: OwnerRule[] = [
  { pattern: "app/api/billing/**", owners: [DEMO_DEVS[0]] },
  { pattern: "app/api/auth/**", owners: [DEMO_DEVS[1]] },
  { pattern: "app/checkout/**", owners: [DEMO_DEVS[0], DEMO_DEVS[2]] },
  { pattern: "lib/db/**", owners: [DEMO_DEVS[3]] },
  { pattern: "**", owners: [DEMO_DEVS[4]] },
]

const DEMO_INCIDENTS: Array<{
  hoursAgo: number
  severity: Severity
  source: Incident["source"]
  title: string
  errorMessage: string
  service: string
  files: string[]
  resolvedAfterMs?: number
  ai: AIReport
  responsibleSlackIds: string[]
}> = [
  {
    hoursAgo: 0.02, // ~1 minute ago — LIVE incident
    severity: "P1",
    source: "vercel",
    title: "blamebot-prod: deployment.error",
    errorMessage: "Build failed: Module not found: 'stripe-internal'\n  at app/api/billing/charge/route.ts:7",
    service: "blamebot-prod",
    files: ["app/api/billing/charge/route.ts", "lib/stripe.ts"],
    ai: {
      rootCause:
        "Dependency `stripe-internal` was renamed in PR #482 but the import path in `app/api/billing/charge/route.ts` was not updated. Build fails before the deployment can serve traffic.",
      blastRadius:
        "All checkout traffic. Production is currently serving the previous deployment, but the broken build is blocking any further deploys.",
      recommendedAction: "Roll back to the previous READY production deployment immediately.",
      recommendedActionType: "rollback",
      historicalContext: "2 prior incidents in the last 30 days touched `lib/stripe.ts` — both were resolved by rollback.",
      confidence: "high",
    },
    responsibleSlackIds: ["U_SARAH", "U_DIEGO"],
  },
  {
    hoursAgo: 6,
    severity: "P2",
    source: "sentry",
    title: "TypeError: cannot read properties of undefined (reading 'plan')",
    errorMessage: "TypeError: cannot read properties of undefined (reading 'plan') at SubscriptionCard:42",
    service: "frontend",
    files: ["components/subscription-card.tsx"],
    resolvedAfterMs: 18 * 60_000,
    ai: {
      rootCause:
        "A recent refactor removed the `plan` field from the user object returned by `/api/me`, but `SubscriptionCard` still reads it directly without a guard.",
      blastRadius: "Logged-in users on the dashboard who have no active subscription.",
      recommendedAction: "Hotfix: add nullish guard around `user.plan` in `components/subscription-card.tsx`.",
      recommendedActionType: "hotfix",
      historicalContext: "First incident on this file in the last 30 days.",
      confidence: "medium",
    },
    responsibleSlackIds: ["U_TOM"],
  },
  {
    hoursAgo: 14,
    severity: "P1",
    source: "uptime",
    title: "blamebot.app is DOWN",
    errorMessage: "Monitor reported DOWN — HTTP 504 from Vercel edge",
    service: "uptime",
    files: [],
    resolvedAfterMs: 4 * 60_000,
    ai: {
      rootCause: "Edge function `app/api/dashboard/route.ts` exceeded the 25s execution limit during peak load.",
      blastRadius: "All dashboard pageviews returned 504 for ~4 minutes.",
      recommendedAction: "Investigate cold-start time of `dashboard/route.ts`; consider moving heavy computation off the request path.",
      recommendedActionType: "investigate",
      historicalContext: "Similar 504s observed 9 days ago — also originated from `dashboard/route.ts`.",
      confidence: "high",
    },
    responsibleSlackIds: ["U_TOM"],
  },
  {
    hoursAgo: 23,
    severity: "P2",
    source: "sentry",
    title: "ECONNREFUSED at db.query()",
    errorMessage: "Error: connect ECONNREFUSED 10.0.0.4:5432\n  at TCPConnectWrap.afterConnect [as oncomplete]",
    service: "api",
    files: ["lib/db/index.ts"],
    resolvedAfterMs: 32 * 60_000,
    ai: {
      rootCause: "DB connection pool exhausted during the migration window.",
      blastRadius: "Roughly 8% of API requests during a 30-minute window returned 500.",
      recommendedAction: "Increase pool size and add retry-with-backoff in `lib/db/index.ts`.",
      recommendedActionType: "hotfix",
      historicalContext: "First incident on this file in the last 30 days.",
      confidence: "high",
    },
    responsibleSlackIds: ["U_JEN"],
  },
  {
    hoursAgo: 38,
    severity: "P3",
    source: "sentry",
    title: "Unhandled Promise rejection in /api/webhooks/sentry",
    errorMessage: "Unhandled rejection: AbortError: signal is aborted without reason",
    service: "api",
    files: ["app/api/webhooks/sentry/route.ts"],
    resolvedAfterMs: 90 * 60_000,
    ai: {
      rootCause: "Slow downstream call exceeds the 10s fetch abort signal under load.",
      blastRadius: "Some Sentry webhooks dropped silently. Detection delayed by ~2 minutes for affected events.",
      recommendedAction: "Wrap the downstream fetch in a retry, and increase the abort timeout to 20s.",
      recommendedActionType: "investigate",
      historicalContext: "Three similar reports this month.",
      confidence: "medium",
    },
    responsibleSlackIds: ["U_TOM"],
  },
  // Generate 25 more incidents spread across different days/hours for meaningful heatmap
  // Risk pattern: more incidents on Friday afternoons, fewer overnight/weekends
  ...Array.from({ length: 25 }, (_, i) => {
    // Create realistic distribution: Fri 3-6pm = high risk, Sat/Sun = low, nights = low
    const riskHours = [
      { daysAgo: 0, hour: 15 }, // Fri 3pm
      { daysAgo: 0, hour: 17 }, // Fri 5pm
      { daysAgo: 1, hour: 14 }, // Thu 2pm
      { daysAgo: 1, hour: 16 }, // Thu 4pm
      { daysAgo: 2, hour: 11 }, // Wed 11am
      { daysAgo: 2, hour: 15 }, // Wed 3pm
      { daysAgo: 3, hour: 10 }, // Tue 10am
      { daysAgo: 3, hour: 14 }, // Tue 2pm
      { daysAgo: 4, hour: 9 },  // Mon 9am
      { daysAgo: 4, hour: 16 }, // Mon 4pm
      { daysAgo: 5, hour: 13 }, // Sun 1pm (rare)
      { daysAgo: 6, hour: 22 }, // Sat 10pm (rare)
      { daysAgo: 7, hour: 17 }, // Fri 5pm (last week)
      { daysAgo: 7, hour: 18 }, // Fri 6pm
      { daysAgo: 8, hour: 15 }, // Thu 3pm
      { daysAgo: 9, hour: 14 }, // Wed 2pm
      { daysAgo: 10, hour: 11 },// Tue 11am
      { daysAgo: 11, hour: 16 },// Mon 4pm
      { daysAgo: 14, hour: 17 },// Fri 5pm (2 weeks ago)
      { daysAgo: 14, hour: 15 },// Fri 3pm
      { daysAgo: 15, hour: 14 },// Thu 2pm
      { daysAgo: 16, hour: 10 },// Wed 10am
      { daysAgo: 21, hour: 16 },// Fri 4pm (3 weeks ago)
      { daysAgo: 22, hour: 15 },// Thu 3pm
      { daysAgo: 28, hour: 17 },// Fri 5pm (4 weeks ago)
    ][i]
    const hoursAgo = riskHours.daysAgo * 24 + (24 - riskHours.hour)
    
    return {
      hoursAgo,
      severity: (i % 5 === 0 ? "P1" : i % 3 === 0 ? "P2" : "P3") as Severity,
      source: (["sentry", "vercel", "uptime"] as const)[i % 3],
      title:
        i % 3 === 0
          ? `Spike in 500s on /api/${["billing", "auth", "search", "checkout", "users"][i % 5]}`
          : i % 3 === 1
          ? `deployment.error on ${["frontend", "api", "worker", "cron"][i % 4]}`
          : `Monitor DOWN: ${["checkout", "api", "dashboard", "auth"][i % 4]}.blamebot.app`,
      errorMessage:
        i % 3 === 0
          ? `5xx rate jumped to ${(1.5 + (i % 4)).toFixed(1)}% on /api/${["billing", "auth", "search", "checkout", "users"][i % 5]}`
          : i % 3 === 1
          ? `Build failed: ${["TS2304", "Module not found", "ENOSPC", "Out of memory", "Timeout"][i % 5]}`
          : `HTTP ${[502, 503, 504, 500][i % 4]} from edge`,
      service: ["billing", "auth", "frontend", "api", "checkout"][i % 5],
      files: [
        `app/api/${["billing", "auth", "search", "checkout", "users"][i % 5]}/route.ts`,
        `lib/${["stripe", "auth", "search", "db", "cache"][i % 5]}.ts`,
      ],
      resolvedAfterMs: (8 + (i % 12) * 5) * 60_000,
      ai: {
        rootCause: [
          "Recent change introduced a regression in this code path.",
          "Dependency update broke the expected API contract.",
          "Configuration drift between staging and production.",
          "Cold start latency exceeded timeout threshold.",
          "Database connection pool exhausted under load.",
        ][i % 5],
        blastRadius: [
          "All checkout traffic affected for ~5 minutes.",
          "A subset of authenticated users saw errors.",
          "Dashboard users experienced slow loads.",
          "API consumers received intermittent 500s.",
          "Background jobs failed silently.",
        ][i % 5],
        recommendedAction: "Review the linked PR and roll back if no quick fix is available.",
        recommendedActionType: ["rollback", "hotfix", "investigate", "monitor"][i % 4] as AIReport["recommendedActionType"],
        historicalContext: i % 2 === 0 ? `${1 + (i % 3)} prior incidents on this file in the last 30 days.` : "First incident on this file.",
        confidence: (["high", "medium", "low"] as const)[i % 3],
      } satisfies AIReport,
      responsibleSlackIds: [DEMO_DEVS[i % DEMO_DEVS.length].slackUserId],
    }
  }),
]

export async function POST(req: NextRequest) {
  const isAdmin = await isAdminFromCookies()
  // Demo affordance: in dev, allow seeding without admin so judges can play locally.
  const allowOpen = process.env.NODE_ENV !== "production"
  if (!isAdmin && !allowOpen) {
    return NextResponse.json({ error: "admin only" }, { status: 401 })
  }

  // Reset live counts per dev — easier than diffing.
  await kv.config.owners.put(DEMO_OWNERS)
  await kv.config.escalation.put({
    delayMinutes: 5,
    contacts: [
      { slackUserId: "U_ENG_LEAD", name: "Alex (eng-lead)", severity: "P1" },
      { slackUserId: "U_ENG_LEAD", name: "Alex (eng-lead)", severity: "P2" },
    ],
  })
  await kv.config.severity.put({
    defaultSeverity: "P3",
    rules: [
      { severity: "P1", isSiteDown: true },
      { severity: "P1", isDeploymentFailure: true },
      { severity: "P1", errorIncludes: ["payment", "billing", "checkout"] },
      { severity: "P2", errorIncludes: ["TypeError", "500", "ECONNREFUSED"] },
    ],
  })
  await kv.config.autopilot.put({
    enabled: false,
    perSeverity: { P1: false, P2: false, P3: false },
    delayMinutes: 10,
  })
  await kv.config.blackout.put({
    enabled: false,
    tz: "America/New_York",
    startHour: 22,
    endHour: 7,
    fallbackContact: { slackUserId: "U_MAYA", name: "Maya Patel" },
  })
  await kv.config.integrations.stamp("vercel")
  await kv.config.integrations.stamp("sentry")
  await kv.config.integrations.stamp("uptime")

  const created: string[] = []
  for (const d of DEMO_INCIDENTS) {
    const createdAt = new Date(Date.now() - d.hoursAgo * 60 * 60 * 1000).toISOString()
    const responsible = DEMO_DEVS.filter((dev) => d.responsibleSlackIds.includes(dev.slackUserId))
    const inc: Incident = {
      id: incidentId(),
      source: d.source,
      externalId: `seed_${created.length}`,
      title: d.title,
      errorMessage: d.errorMessage,
      severity: d.severity,
      status: d.resolvedAfterMs ? "resolved" : "active",
      service: d.service,
      filesChanged: d.files,
      responsibleDevs: responsible,
      similarIncidentIds: [],
      slackChannelId: undefined,
      slackThreadTs: undefined,
      slackThread: [
        {
          id: messageId(),
          ts: createdAt,
          user: { id: "BlameBot", name: "BlameBot" },
          isBot: true,
          text: `${d.severity} — ${d.title}`,
        },
        ...(d.resolvedAfterMs
          ? [
              {
                id: messageId(),
                ts: new Date(new Date(createdAt).getTime() + (d.resolvedAfterMs ?? 60_000) * 0.4).toISOString(),
                user: { id: responsible[0]?.slackUserId ?? "U_ONCALL", name: responsible[0]?.name ?? "oncall" },
                text: "I'm on it.",
              },
              {
                id: messageId(),
                ts: new Date(new Date(createdAt).getTime() + (d.resolvedAfterMs ?? 60_000) * 0.9).toISOString(),
                user: { id: responsible[0]?.slackUserId ?? "U_ONCALL", name: responsible[0]?.name ?? "oncall" },
                text: "Resolved",
              },
            ]
          : []),
      ],
      timeline: [
        {
          id: eventId(),
          ts: createdAt,
          kind: "created",
          actor: "system",
          message: `Incident created from ${d.source}`,
        },
        {
          id: eventId(),
          ts: createdAt,
          kind: "ai_report",
          actor: "BlameBot",
          message: d.ai.recommendedAction,
          data: d.ai,
        },
        ...(d.resolvedAfterMs
          ? [
              {
                id: eventId(),
                ts: new Date(new Date(createdAt).getTime() + d.resolvedAfterMs * 0.4).toISOString(),
                kind: "acknowledged" as const,
                actor: responsible[0]?.slackUserId ?? "U_ONCALL",
                message: `Acknowledged by ${responsible[0]?.name ?? "oncall"}`,
              },
              {
                id: eventId(),
                ts: new Date(new Date(createdAt).getTime() + d.resolvedAfterMs).toISOString(),
                kind: "resolved" as const,
                actor: responsible[0]?.slackUserId ?? "U_ONCALL",
                message: `Resolved by ${responsible[0]?.name ?? "oncall"}`,
              },
            ]
          : []),
      ],
      aiReport: d.ai,
      createdAt,
      acknowledgedAt: d.resolvedAfterMs
        ? new Date(new Date(createdAt).getTime() + d.resolvedAfterMs * 0.4).toISOString()
        : null,
      resolvedAt: d.resolvedAfterMs ? new Date(new Date(createdAt).getTime() + d.resolvedAfterMs).toISOString() : null,
      resolvedBy: d.resolvedAfterMs && responsible[0] ? { slackUserId: responsible[0].slackUserId, name: responsible[0].name } : null,
    }
    await kv.incidents.put(inc)
    created.push(inc.id)
  }

  // Devscores rollup
  for (const dev of DEMO_DEVS) {
    const causes = DEMO_INCIDENTS.filter((d) => d.responsibleSlackIds.includes(dev.slackUserId)).length
    const resolvedCount = DEMO_INCIDENTS.filter(
      (d) => d.resolvedAfterMs && d.responsibleSlackIds.includes(dev.slackUserId),
    ).length
    const totalResolveMs = DEMO_INCIDENTS.filter(
      (d) => d.resolvedAfterMs && d.responsibleSlackIds.includes(dev.slackUserId),
    ).reduce((acc, d) => acc + (d.resolvedAfterMs ?? 0), 0)
    await kv.devscores.upsert(dev, {
      caused: causes,
      resolved: resolvedCount,
      postmortemsWritten: Math.floor(resolvedCount / 2),
      avgResponseMs: resolvedCount ? Math.round(totalResolveMs / resolvedCount) : null,
      lastIncidentAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    })
  }

  return NextResponse.json({ ok: true, created: created.length })
}
