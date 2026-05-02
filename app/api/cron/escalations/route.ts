import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { rollback } from "@/lib/pipeline/actions"
import { postEscalation } from "@/lib/slack/post"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  // Vercel sets `authorization: Bearer ${CRON_SECRET}` if CRON_SECRET is set.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }
  }

  const ids = await kv.escalations.drainDue()
  const escCfg = await kv.config.escalation.get()
  const autopilot = await kv.config.autopilot.get()

  const fired: { id: string; action: string }[] = []

  for (const id of ids) {
    const inc = await kv.incidents.get(id)
    if (!inc) continue
    if (inc.status === "resolved") continue

    // Autopilot path
    if (autopilot.enabled && autopilot.perSeverity[inc.severity] && !inc.autopilotActed) {
      inc.autopilotActed = true
      await kv.incidents.update(inc)
      await rollback(inc, { id: "BlameBot", name: "BlameBot (autopilot)" })
      fired.push({ id, action: "autopilot_rollback" })
      continue
    }

    // Otherwise escalate.
    const contact = escCfg.contacts.find((c) => c.severity === inc.severity) || escCfg.contacts[0]
    if (contact) {
      await postEscalation(inc, contact)
      fired.push({ id, action: `escalated_to_${contact.name}` })
    }
  }

  return NextResponse.json({ ok: true, processed: ids.length, fired })
}
