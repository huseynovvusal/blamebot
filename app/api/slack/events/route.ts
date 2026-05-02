import { type NextRequest, NextResponse } from "next/server"
import { verifySlackSignature } from "@/lib/hmac"
import { findIncidentByThread } from "@/lib/slack/lookup"
import { rollback, draftHotfix, markResolved, acknowledge } from "@/lib/pipeline/actions"
import { answerQuestion } from "@/lib/pipeline/ai"
import { postReply } from "@/lib/slack/post"
import { getUser } from "@/lib/slack/client"
import { bumpResolvedFor } from "@/lib/pipeline/devscore"
import { kv } from "@/lib/kv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const secret = process.env.SLACK_SIGNING_SECRET
  if (secret) {
    const ts = req.headers.get("x-slack-request-timestamp")
    const sig = req.headers.get("x-slack-signature")
    if (!(await verifySlackSignature(raw, ts, sig, secret))) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  }

  let body: Record<string, any>
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  // URL verification handshake
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge })
  }

  if (body.type !== "event_callback") {
    return NextResponse.json({ ok: true })
  }

  const event = body.event as Record<string, any>
  const eventType = event.type

  // Only react to messages in threads (replies) or app mentions in incident thread.
  if (eventType === "message" && event.subtype) {
    return NextResponse.json({ ok: true }) // ignore edits/deletes
  }
  if (eventType !== "message" && eventType !== "app_mention") {
    return NextResponse.json({ ok: true })
  }
  // Only thread replies — top-level messages would create a loop.
  const threadTs: string | undefined = event.thread_ts
  if (!threadTs) {
    return NextResponse.json({ ok: true })
  }
  if (event.bot_id) {
    return NextResponse.json({ ok: true })
  }

  const channel: string = event.channel
  const userId: string = event.user
  const text: string = String(event.text || "")
  const incident = await findIncidentByThread(channel, threadTs)
  if (!incident) return NextResponse.json({ ok: true })

  const userInfo = (await getUser(userId)) ?? { id: userId, name: userId }

  // First reply auto-acknowledges.
  if (incident.status === "active") {
    await acknowledge(incident, userInfo)
  }

  // Mirror raw reply into KV thread.
  await postReply(incident, { actor: userInfo, text })

  const lower = text.toLowerCase().replace(/<@[^>]+>/g, "").trim()
  if (/^rollback\b/.test(lower)) {
    await rollback(incident, userInfo)
  } else if (/^hotfix\b/.test(lower)) {
    await draftHotfix(incident, userInfo)
  } else if (/^autopilot\b/.test(lower)) {
    const cfg = await kv.config.autopilot.get()
    cfg.enabled = true
    cfg.perSeverity[incident.severity] = true
    await kv.config.autopilot.put(cfg)
    await postReply(incident, {
      actor: { id: "BlameBot", name: "BlameBot" },
      text: `Autopilot enabled for ${incident.severity}. I'll auto-rollback if unresolved in ${cfg.delayMinutes}m.`,
    })
  } else if (/^(resolved|fixed|done)\b/.test(lower)) {
    const responseMs =
      incident.acknowledgedAt
        ? Date.now() - new Date(incident.acknowledgedAt).getTime()
        : Date.now() - new Date(incident.createdAt).getTime()
    await bumpResolvedFor({ slackUserId: userInfo.id, name: userInfo.name }, responseMs)
    await markResolved(incident, userInfo)
  } else {
    const answer = await answerQuestion(text, incident)
    await postReply(incident, { actor: { id: "BlameBot", name: "BlameBot" }, text: answer })
  }

  return NextResponse.json({ ok: true })
}
