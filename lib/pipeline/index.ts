import { kv } from "../kv"
import { eventId } from "../ids"
import { normalize, newIncidentSkeleton, type RawWebhook } from "./normalize"
import { enrichWithGit, resolveOwners } from "./enrich"
import { decideSeverity } from "./severity"
import { findSimilarIncidents } from "./history"
import { generateIncidentReport } from "./ai"
import { bumpCausedFor } from "./devscore"
import { postIncidentReport } from "../slack/post"
import type { Incident } from "../types"

/**
 * The full incident pipeline. All three webhook receivers call this.
 * Returns the persisted incident.
 */
export async function processIncident(raw: RawWebhook): Promise<Incident> {
  const seed = normalize(raw)
  let incident = newIncidentSkeleton(seed)

  // 1. Git enrichment
  incident = await enrichWithGit(incident)

  // 2. Owners
  const ownerRules = await kv.config.owners.get()
  incident.responsibleDevs = resolveOwners(incident.filesChanged, ownerRules)

  // 3. Severity
  const sevCfg = await kv.config.severity.get()
  incident.severity = decideSeverity(incident, sevCfg, {
    isDeploymentFailure: seed.isDeploymentFailure,
    isSiteDown: seed.isSiteDown,
  })

  // 4. Similar incidents (must persist a stub first so listByFile picks up THIS one too —
  //    but easier: query before persisting and exclude self).
  const similar = await findSimilarIncidents(incident)
  incident.similarIncidentIds = similar.map((s) => s.id)

  // 5. AI report
  const ai = await generateIncidentReport({ incident, similar })
  incident.aiReport = ai
  incident.timeline.push({
    id: eventId(),
    ts: new Date().toISOString(),
    kind: "ai_report",
    actor: "BlameBot",
    message: ai.recommendedAction,
    data: ai,
  })

  // 6. Persist
  await kv.incidents.put(incident)

  // 7. Devscores
  if (incident.responsibleDevs.length > 0) {
    await bumpCausedFor(incident.responsibleDevs, incident)
  }

  // 8. Slack post (also mirrors into KV thread + timeline)
  incident = (await postIncidentReport(incident)) ?? incident

  // 9. Schedule escalation
  const escCfg = await kv.config.escalation.get()
  await kv.escalations.schedule(incident.id, Date.now() + escCfg.delayMinutes * 60 * 1000)

  // 10. Stamp integration last-seen
  if (raw.source === "vercel" || raw.source === "sentry" || raw.source === "uptime") {
    await kv.config.integrations.stamp(raw.source)
  }

  return incident
}
