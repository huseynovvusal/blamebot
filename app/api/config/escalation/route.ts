import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { EscalationConfigSchema } from "@/lib/schemas"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(await kv.config.escalation.get())
}

export async function PUT(req: NextRequest) {
  const parsed = EscalationConfigSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 })
  await kv.config.escalation.put(parsed.data)
  return NextResponse.json({ ok: true })
}
