import { kv } from "../kv"
import type { Incident, Owner } from "../types"

export async function bumpCausedFor(devs: Owner[], incident: Incident): Promise<void> {
  for (const owner of devs) {
    const existing = await kv.devscores.get(owner.slackUserId)
    await kv.devscores.upsert(owner, {
      caused: (existing?.caused ?? 0) + 1,
      lastIncidentAt: incident.createdAt,
    })
  }
}

export async function bumpResolvedFor(owner: Owner, responseMs: number | null): Promise<void> {
  const existing = await kv.devscores.get(owner.slackUserId)
  const prevAvg = existing?.avgResponseMs ?? null
  const prevResolved = existing?.resolved ?? 0
  const nextResolved = prevResolved + 1
  let nextAvg: number | null = prevAvg
  if (responseMs != null) {
    nextAvg = prevAvg == null ? responseMs : Math.round((prevAvg * prevResolved + responseMs) / nextResolved)
  }
  await kv.devscores.upsert(owner, {
    resolved: nextResolved,
    avgResponseMs: nextAvg,
  })
}

export async function bumpPostmortemFor(owner: Owner): Promise<void> {
  const existing = await kv.devscores.get(owner.slackUserId)
  await kv.devscores.upsert(owner, {
    postmortemsWritten: (existing?.postmortemsWritten ?? 0) + 1,
  })
}
