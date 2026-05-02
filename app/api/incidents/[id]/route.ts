import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { acknowledge, markResolved } from "@/lib/pipeline/actions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inc = await kv.incidents.get(id)
  if (!inc) return NextResponse.json({ error: "not found" }, { status: 404 })
  const postmortem = await kv.postmortems.get(id)
  // Hydrate similar incident summaries for the detail view.
  const similar = (
    await Promise.all((inc.similarIncidentIds ?? []).map((sid) => kv.incidents.get(sid)))
  ).filter((x): x is NonNullable<typeof x> => !!x)
  return NextResponse.json({ incident: inc, postmortem, similar })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inc = await kv.incidents.get(id)
  if (!inc) return NextResponse.json({ error: "not found" }, { status: 404 })

  const body = (await req.json()) as { action?: "ack" | "resolve"; by?: { id: string; name: string } }
  const by = body.by ?? { id: "U_DASHBOARD", name: "Dashboard user" }

  if (body.action === "ack") {
    const updated = await acknowledge(inc, by)
    return NextResponse.json({ incident: updated })
  }
  if (body.action === "resolve") {
    const updated = await markResolved(inc, by)
    return NextResponse.json({ incident: updated })
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 })
}
