import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { generatePostmortem } from "@/lib/pipeline/ai"
import { postPostmortem } from "@/lib/slack/post"
import { bumpPostmortemFor } from "@/lib/pipeline/devscore"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inc = await kv.incidents.get(id)
  if (!inc) return NextResponse.json({ error: "not found" }, { status: 404 })

  const draft = await generatePostmortem({ incident: inc })
  const pm = {
    incidentId: id,
    generatedAt: new Date().toISOString(),
    ...draft,
  }
  await kv.postmortems.put(pm)
  await postPostmortem(inc, pm)
  // Credit the resolver if any.
  if (inc.resolvedBy) {
    await bumpPostmortemFor({ slackUserId: inc.resolvedBy.slackUserId, name: inc.resolvedBy.name })
  }
  return NextResponse.json({ postmortem: pm })
}
