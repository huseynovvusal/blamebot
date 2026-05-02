import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { AutopilotConfigSchema } from "@/lib/schemas"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(await kv.config.autopilot.get())
}

export async function PUT(req: NextRequest) {
  const parsed = AutopilotConfigSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 })
  await kv.config.autopilot.put(parsed.data)
  return NextResponse.json({ ok: true })
}
