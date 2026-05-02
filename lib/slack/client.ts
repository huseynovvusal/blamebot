// Lightweight Slack Web API wrapper. No SDK, just fetch — keeps the dep list tight
// and degrades to a no-op when SLACK_BOT_TOKEN is missing (the dashboard's mirrored
// thread takes over visually).

const API = "https://slack.com/api"

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_INCIDENTS_CHANNEL_ID
}

function token(): string | null {
  return process.env.SLACK_BOT_TOKEN ?? null
}

async function call<T = unknown>(method: string, body: unknown): Promise<T | null> {
  const t = token()
  if (!t) return null
  try {
    const res = await fetch(`${API}/${method}`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${t}`,
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as { ok: boolean } & Record<string, unknown>
    if (!json.ok) {
      console.error("[v0] Slack API error", method, json)
      return null
    }
    return json as T
  } catch (e) {
    console.error("[v0] Slack fetch failed", method, e)
    return null
  }
}

export type SlackPostResult = {
  channel: string
  ts: string
} | null

export async function chatPostMessage(opts: {
  channel: string
  text: string
  blocks?: unknown[]
  thread_ts?: string
}): Promise<SlackPostResult> {
  const r = await call<{ channel: string; ts: string }>("chat.postMessage", opts)
  if (!r) return null
  return { channel: r.channel, ts: r.ts }
}

export async function chatPostInThread(opts: {
  channel: string
  thread_ts: string
  text: string
  blocks?: unknown[]
}): Promise<SlackPostResult> {
  return chatPostMessage(opts)
}

export async function getUser(userId: string): Promise<{ id: string; name: string } | null> {
  const t = token()
  if (!t) return null
  try {
    const res = await fetch(`${API}/users.info?user=${encodeURIComponent(userId)}`, {
      headers: { authorization: `Bearer ${t}` },
    })
    const json = (await res.json()) as {
      ok: boolean
      user?: { id: string; real_name?: string; name?: string }
    }
    if (!json.ok || !json.user) return null
    return { id: json.user.id, name: json.user.real_name || json.user.name || json.user.id }
  } catch {
    return null
  }
}

export const INCIDENTS_CHANNEL = process.env.SLACK_INCIDENTS_CHANNEL_ID ?? ""
