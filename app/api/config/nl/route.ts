import { type NextRequest, NextResponse } from "next/server"
import { parseNLConfig } from "@/lib/pipeline/ai"
import { kv } from "@/lib/kv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const { text } = (await req.json()) as { text?: string }
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 })
  const patch = await parseNLConfig(text)

  let applied = false
  if (patch.intent === "add_owner" && patch.ownersPatch) {
    const owners = await kv.config.owners.get()
    const idx = owners.findIndex((o) => o.pattern === patch.ownersPatch!.pattern)
    if (idx >= 0) owners[idx] = patch.ownersPatch
    else owners.unshift(patch.ownersPatch)
    await kv.config.owners.put(owners)
    applied = true
  } else if (patch.intent === "set_escalation" && patch.escalationPatch) {
    await kv.config.escalation.put(patch.escalationPatch)
    applied = true
  } else if (patch.intent === "set_severity_rule" && patch.severityRulePatch) {
    const sev = await kv.config.severity.get()
    sev.rules.unshift(patch.severityRulePatch)
    await kv.config.severity.put(sev)
    applied = true
  } else if (patch.intent === "set_blackout" && patch.blackoutPatch) {
    await kv.config.blackout.put(patch.blackoutPatch)
    applied = true
  } else if (patch.intent === "set_autopilot" && patch.autopilotPatch) {
    await kv.config.autopilot.put(patch.autopilotPatch)
    applied = true
  }

  return NextResponse.json({
    applied,
    intent: patch.intent,
    summary: patch.summary,
    patch,
  })
}
