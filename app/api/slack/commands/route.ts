import { type NextRequest, NextResponse } from "next/server"
import { verifySlackSignature } from "@/lib/hmac"
import { parseNLConfig } from "@/lib/pipeline/ai"
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
  const params = new URLSearchParams(raw)
  const text = params.get("text") || ""
  const command = params.get("command") || ""

  if (!text.trim()) {
    return NextResponse.json({
      response_type: "ephemeral",
      text:
        `*${command} help*\n` +
        `Try things like:\n` +
        `• \`${command} make sarah responsible for billing/* code\`\n` +
        `• \`${command} page eng-lead after 5 minutes for P1\`\n` +
        `• \`${command} treat anything in payments code as P1\`\n` +
        `• \`${command} enable autopilot rollback for P1 after 10 minutes\``,
    })
  }

  const patch = await parseNLConfig(text)
  let confirmation = patch.summary

  try {
    if (patch.intent === "add_owner" && patch.ownersPatch) {
      const owners = await kv.config.owners.get()
      const existingIdx = owners.findIndex((o) => o.pattern === patch.ownersPatch!.pattern)
      if (existingIdx >= 0) owners[existingIdx] = patch.ownersPatch
      else owners.unshift(patch.ownersPatch)
      await kv.config.owners.put(owners)
    } else if (patch.intent === "set_escalation" && patch.escalationPatch) {
      await kv.config.escalation.put(patch.escalationPatch)
    } else if (patch.intent === "set_severity_rule" && patch.severityRulePatch) {
      const sev = await kv.config.severity.get()
      sev.rules.unshift(patch.severityRulePatch)
      await kv.config.severity.put(sev)
    } else if (patch.intent === "set_blackout" && patch.blackoutPatch) {
      await kv.config.blackout.put(patch.blackoutPatch)
    } else if (patch.intent === "set_autopilot" && patch.autopilotPatch) {
      await kv.config.autopilot.put(patch.autopilotPatch)
    } else {
      confirmation = `I couldn't parse that. ${confirmation}`
    }
  } catch (e) {
    confirmation = `Failed to apply config: ${e instanceof Error ? e.message : String(e)}`
  }

  return NextResponse.json({
    response_type: "ephemeral",
    text: `:gear: ${confirmation}`,
  })
}
