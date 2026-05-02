// Domain types for BlameBot.
// All persistence is in Upstash for Redis (Vercel KV).

export type Severity = "P1" | "P2" | "P3"
export type IncidentStatus = "active" | "acknowledged" | "resolved"
export type IncidentSource = "vercel" | "sentry" | "uptime" | "manual" | "seed"

export type Owner = {
  slackUserId: string
  name: string
}

export type OwnerRule = {
  pattern: string // glob-ish: "app/api/billing/**", "lib/db/*", "**" for fallback
  owners: Owner[]
}

export type EscalationConfig = {
  delayMinutes: number
  contacts: { slackUserId: string; name: string; severity: Severity }[]
}

export type SeverityRule = {
  severity: Severity
  // Match if ANY of these conditions hold:
  errorIncludes?: string[] // substring match against error message
  sourceIs?: IncidentSource[]
  isDeploymentFailure?: boolean
  isSiteDown?: boolean
}

export type SeverityConfig = {
  defaultSeverity: Severity
  rules: SeverityRule[]
}

export type BlackoutConfig = {
  enabled: boolean
  tz: string
  startHour: number // 0-23 local
  endHour: number // 0-23 local
  fallbackContact: { slackUserId: string; name: string } | null
}

export type AutopilotConfig = {
  enabled: boolean
  perSeverity: { P1: boolean; P2: boolean; P3: boolean }
  delayMinutes: number // wait this long with no human response before auto-acting
}

export type IntegrationStatus = {
  vercel: { lastReceivedAt: string | null }
  sentry: { lastReceivedAt: string | null }
  uptime: { lastReceivedAt: string | null }
}

export type TimelineEvent = {
  id: string
  ts: string // ISO
  kind:
    | "created"
    | "ai_report"
    | "slack_post"
    | "slack_reply"
    | "acknowledged"
    | "rollback"
    | "hotfix"
    | "autopilot"
    | "escalation"
    | "resolved"
    | "postmortem"
    | "system"
  actor: string // slack user id, "BlameBot", "system", "vercel-api"
  message: string
  data?: Record<string, unknown>
}

export type SlackMessage = {
  id: string
  ts: string // ISO
  user: { id: string; name: string }
  text: string
  isBot?: boolean
  blocks?: unknown[] // raw Slack blocks if any
}

export type AIReport = {
  rootCause: string
  blastRadius: string
  recommendedAction: string
  recommendedActionType: "rollback" | "hotfix" | "investigate" | "monitor"
  historicalContext: string
  confidence: "high" | "medium" | "low"
}

export type Incident = {
  id: string
  source: IncidentSource
  externalId: string // sentry issue id, vercel deployment id, uptime monitor id
  title: string
  errorMessage: string
  severity: Severity
  status: IncidentStatus
  service: string // "frontend", "api", "billing", etc — extracted from owner rule path
  url?: string // link to source (sentry/vercel)
  commit?: { sha: string; message: string; authorSlackId?: string; authorName?: string }
  pr?: { number: number; title: string; url: string }
  filesChanged?: string[]
  responsibleDevs: Owner[]
  similarIncidentIds: string[]
  aiReport?: AIReport
  slackChannelId?: string
  slackThreadTs?: string
  slackThread: SlackMessage[]
  timeline: TimelineEvent[]
  createdAt: string // ISO
  acknowledgedAt?: string | null
  resolvedAt?: string | null
  resolvedBy?: { slackUserId: string; name: string } | null
  autopilotActed?: boolean
}

export type DevScore = {
  slackUserId: string
  name: string
  caused: number
  resolved: number
  postmortemsWritten: number
  avgResponseMs: number | null
  reliabilityScore: number // 0-100, computed on read
  lastIncidentAt: string | null
}

export type Postmortem = {
  incidentId: string
  generatedAt: string
  summary: string
  rootCause: string
  timelineMarkdown: string
  whatWentWell: string[]
  whatWentWrong: string[]
  actionItems: { owner: string; description: string; dueInDays: number }[]
}

export type HeatmapCell = {
  dow: number        // 0=Sun, 6=Sat
  hour: number       // 0-23
  count: number
  riskLevel: "safe" | "low" | "medium" | "high" | "critical"
}

export type LeaderboardEntry = {
  slackUserId: string
  name: string
  resolved: number
  avgMttrMs: number | null
  streak: number         // consecutive incidents resolved without causing one
  rank: number
  trend: "up" | "down" | "stable"
}

export type ServiceHealth = {
  service: string
  incidentCount: number
  p1Count: number
  p2Count: number
  p3Count: number
  avgMttrMs: number | null
  lastIncidentAt: string | null
  healthScore: number    // 0-100, higher = healthier
}

export type AnalyticsSnapshot = {
  totals: { active: number; today: number; week: number; thirtyDays: number }
  mttr: { thirtyDayMs: number | null; weekMs: number | null }
  incidentsOverTime: { date: string; P1: number; P2: number; P3: number }[]
  topFiles: { path: string; count: number }[]
  topServices: { service: string; count: number }[]
  devScores: DevScore[]
  heatmap: HeatmapCell[]
  leaderboard: LeaderboardEntry[]
  serviceHealth: ServiceHealth[]
  riskWindows: { label: string; dow: number; hourStart: number; hourEnd: number; avgIncidents: number }[]
}
