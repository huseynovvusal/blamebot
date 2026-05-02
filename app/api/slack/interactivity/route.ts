import { type NextRequest, NextResponse } from "next/server"
import { verifySlackSignature } from "@/lib/hmac"
import { kv } from "@/lib/kv"
import { rollback, draftHotfix, markResolved, acknowledge } from "@/lib/pipeline/actions"
import { postReply } from "@/lib/slack/post"
import { getUser } from "@/lib/slack/client"

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
  const params = new URLSearchParams(raw)
  const payloadJson = params.get("payload")
  if (!payloadJson) return NextResponse.json({ ok: true })
  const payload = JSON.parse(payloadJson) as {
    type: string
    user: { id: string; name?: string }
    actions: { action_id: string; value: string }[]
  }
  const action = payload.actions?.[0]
  if (!action) return NextResponse.json({ ok: true })
  const incidentId = action.value
  const incident = await kv.incidents.get(incidentId)
  if (!incident) return NextResponse.json({ ok: true })
  const userInfo = (await getUser(payload.user.id)) ?? { id: payload.user.id, name: payload.user.name ?? payload.user.id }

  switch (action.action_id) {
    case "rollback":
      await rollback(incident, userInfo)
      break
    case "hotfix":
      await draftHotfix(incident, userInfo)
      break
    case "autopilot": {
      const cfg = await kv.config.autopilot.get()
      cfg.enabled = true
      cfg.perSeverity[incident.severity] = true
      await kv.config.autopilot.put(cfg)
      break
    }
    case "acknowledge": {
      const updated = await acknowledge(incident, userInfo)
      await postReply(updated, {
        actor: { id: "BlameBot", name: "BlameBot" },
        text: `:eyes: Acknowledged by <@${userInfo.id}>`,
      })
      break
    }
    case "resolve":
      await markResolved(incident, userInfo)
      break
  }

  return NextResponse.json({ ok: true })
}
