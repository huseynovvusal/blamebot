import type { Incident, IncidentSource } from "../types"
import { incidentId, eventId } from "../ids"

export type RawWebhook = {
  source: IncidentSource
  body: Record<string, unknown>
}

export type NormalizedSeed = {
  source: IncidentSource
  externalId: string
  title: string
  errorMessage: string
  url?: string
  commitSha?: string
  service?: string
  isDeploymentFailure?: boolean
  isSiteDown?: boolean
}

/** Best-effort normalizer for the three webhook providers. Tolerant to schema drift. */
export function normalize(raw: RawWebhook): NormalizedSeed {
  const b = raw.body as Record<string, any>

  if (raw.source === "vercel") {
    // Vercel webhook: type like "deployment.error" / "deployment.failed"
    const type = (b.type as string) || ""
    const payload = (b.payload as Record<string, any>) || b
    const deployment = payload.deployment ?? payload
    const project = payload.project ?? payload
    const commit = (deployment?.meta?.githubCommitSha as string) || (deployment?.meta?.commitSha as string)
    return {
      source: "vercel",
      externalId: String(deployment?.id || payload?.id || b?.id || `vercel_${Date.now()}`),
      title: `${project?.name ?? "vercel"}: ${type || "deployment failed"}`,
      errorMessage:
        (payload?.errorMessage as string) ||
        (deployment?.errorMessage as string) ||
        (deployment?.aliasError?.message as string) ||
        "Vercel deployment failed",
      url: (deployment?.inspectorUrl as string) || (deployment?.url ? `https://${deployment.url}` : undefined),
      commitSha: commit,
      service: (project?.name as string) || "frontend",
      isDeploymentFailure: type.startsWith("deployment.error") || type.startsWith("deployment.failed"),
    }
  }

  if (raw.source === "sentry") {
    // Sentry: action="created" or "triggered", data.issue.{id,title,permalink,metadata}
    const data = (b.data as Record<string, any>) ?? {}
    const issue = (data.issue as Record<string, any>) ?? data.event ?? {}
    const culprit = (issue.culprit as string) || (issue.metadata?.function as string) || ""
    const project = (b.project as Record<string, any>) ?? issue.project ?? {}
    return {
      source: "sentry",
      externalId: String(issue.id || issue.short_id || `sentry_${Date.now()}`),
      title: (issue.title as string) || (issue.metadata?.value as string) || "Sentry issue",
      errorMessage:
        (issue.metadata?.value as string) ||
        (issue.metadata?.type as string) ||
        (issue.title as string) ||
        "Unhandled exception",
      url: (issue.permalink as string) || (issue.web_url as string),
      service: (project?.slug as string) || (project?.name as string) || culprit.split(":")[0] || "api",
    }
  }

  // UptimeRobot: monitorURL, monitorFriendlyName, alertType (1=down,2=up), alertDetails
  const isDown = String(b.alertType ?? b.alert_type ?? "1") === "1"
  const monitorURL = (b.monitorURL as string) || (b.monitor_url as string)
  let service = "uptime"
  if (monitorURL) {
    try {
      service = new URL(monitorURL).hostname
    } catch {
      // malformed URL — keep default
    }
  }
  return {
    source: "uptime",
    externalId: String(b.monitorID ?? b.monitor_id ?? `uptime_${Date.now()}`),
    title: `${b.monitorFriendlyName ?? b.monitor_friendly_name ?? "Site"} ${isDown ? "is DOWN" : "recovered"}`,
    errorMessage:
      (b.alertDetails as string) ||
      (b.alert_details as string) ||
      (isDown ? "Monitor reported DOWN" : "Monitor reported UP"),
    url: monitorURL,
    service,
    isSiteDown: isDown,
  }
}

export function newIncidentSkeleton(seed: NormalizedSeed): Incident {
  const now = new Date().toISOString()
  return {
    id: incidentId(),
    source: seed.source,
    externalId: seed.externalId,
    title: seed.title,
    errorMessage: seed.errorMessage,
    severity: "P3",
    status: "active",
    service: seed.service ?? "unknown",
    url: seed.url,
    commit: seed.commitSha ? { sha: seed.commitSha, message: "" } : undefined,
    responsibleDevs: [],
    similarIncidentIds: [],
    slackThread: [],
    timeline: [
      {
        id: eventId(),
        ts: now,
        kind: "created",
        actor: "system",
        message: `Incident created from ${seed.source}`,
      },
    ],
    createdAt: now,
  }
}
