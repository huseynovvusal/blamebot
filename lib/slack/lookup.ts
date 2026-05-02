import { kv } from "../kv"
import type { Incident } from "../types"

/** Find an incident by its Slack channel + thread_ts. Recent-first scan, capped. */
export async function findIncidentByThread(channel: string, threadTs: string): Promise<Incident | null> {
  const recent = await kv.incidents.listSince(Date.now() - 7 * 24 * 60 * 60 * 1000, 200)
  return recent.find((i) => i.slackChannelId === channel && i.slackThreadTs === threadTs) ?? null
}
