import { kv } from "../kv"
import type { Incident } from "../types"
import { eventId } from "../ids"
import { rollbackProject } from "../vercel-api"
import { openDraftHotfixPR } from "../github"
import { postReply } from "../slack/post"

export async function rollback(incident: Incident, actor: { id: string; name: string }): Promise<Incident> {
  const deploymentId = incident.source === "vercel" ? incident.externalId : undefined
  const result = await rollbackProject(deploymentId)
  const msg = result.ok
    ? `:white_check_mark: Rolled back${result.simulated ? " (simulated — set VERCEL_API_TOKEN to enable real rollback)" : ""}${
        result.rolledBackTo ? ` to ${result.rolledBackTo.url}` : ""
      }.`
    : `:x: Rollback failed: ${result.error ?? "unknown"}`

  incident.timeline.push({
    id: eventId(),
    ts: new Date().toISOString(),
    kind: "rollback",
    actor: actor.id,
    message: msg,
    data: { result },
  })
  await kv.incidents.update(incident)
  await postReply(incident, { actor: { id: "BlameBot", name: "BlameBot" }, text: msg })
  return incident
}

export async function draftHotfix(incident: Incident, actor: { id: string; name: string }): Promise<Incident> {
  const branchName = `blamebot/hotfix-${incident.id.slice(4, 10)}`
  const filePatch = {
    path: "BLAMEBOT_HOTFIX_NOTES.md",
    content:
      `# Hotfix draft for ${incident.id}\n\n` +
      `**Incident:** ${incident.title}\n\n` +
      `**Error:**\n\n\`\`\`\n${incident.errorMessage}\n\`\`\`\n\n` +
      `**Recommended:** ${incident.aiReport?.recommendedAction ?? "investigate"}\n` +
      `**Files involved:** ${(incident.filesChanged ?? []).join(", ") || "n/a"}\n\n` +
      `_This is a starting point — please replace this file with your real patch._\n`,
  }
  const pr = await openDraftHotfixPR({
    baseBranch: "main",
    branchName,
    title: `[hotfix] ${incident.title}`,
    body: `Drafted by BlameBot in response to incident ${incident.id}.\n\n${
      incident.aiReport ? `**Recommended:** ${incident.aiReport.recommendedAction}` : ""
    }`,
    filePatches: [filePatch],
  })
  const msg = pr
    ? `:git: Drafted hotfix PR <${pr.url}|#${pr.number}>.`
    : `:warning: Couldn't draft a real GitHub PR (token/repo not configured). Suggested patch is in the timeline.`
  incident.timeline.push({
    id: eventId(),
    ts: new Date().toISOString(),
    kind: "hotfix",
    actor: actor.id,
    message: msg,
    data: pr ?? { suggestion: filePatch.content },
  })
  await kv.incidents.update(incident)
  await postReply(incident, { actor: { id: "BlameBot", name: "BlameBot" }, text: msg })
  return incident
}

export async function markResolved(incident: Incident, by: { id: string; name: string }): Promise<Incident> {
  if (incident.status === "resolved") return incident
  incident.status = "resolved"
  incident.resolvedAt = new Date().toISOString()
  incident.resolvedBy = { slackUserId: by.id, name: by.name }
  incident.timeline.push({
    id: eventId(),
    ts: incident.resolvedAt,
    kind: "resolved",
    actor: by.id,
    message: `Marked resolved by ${by.name}`,
  })
  await kv.escalations.cancel(incident.id)
  await kv.incidents.update(incident)
  await postReply(incident, { actor: { id: "BlameBot", name: "BlameBot" }, text: `:tada: Resolved by <@${by.id}>` })
  return incident
}

export async function acknowledge(incident: Incident, by: { id: string; name: string }): Promise<Incident> {
  if (incident.status !== "active") return incident
  incident.status = "acknowledged"
  incident.acknowledgedAt = new Date().toISOString()
  incident.timeline.push({
    id: eventId(),
    ts: incident.acknowledgedAt,
    kind: "acknowledged",
    actor: by.id,
    message: `Acknowledged by ${by.name}`,
  })
  await kv.incidents.update(incident)
  return incident
}
