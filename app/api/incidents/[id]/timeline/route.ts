import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { postReply } from "@/lib/slack/post"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const inc = await kv.incidents.get(id)
  if (!inc) return NextResponse.json({ error: "not found" }, { status: 404 })
  const body = (await req.json()) as { text?: string; actor?: { id: string; name: string } }
  if (!body.text) return NextResponse.json({ error: "text required" }, { status: 400 })
  const actor = body.actor ?? { id: "U_DASHBOARD", name: "Dashboard user" }
  await postReply(inc, { actor, text: body.text })
  const fresh = await kv.incidents.get(id)
  return NextResponse.json({ incident: fresh })
}
