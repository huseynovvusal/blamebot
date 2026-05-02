import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import { OwnersConfigSchema } from "@/lib/schemas"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json(await kv.config.owners.get())
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const parsed = OwnersConfigSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 })
  await kv.config.owners.put(parsed.data)
  return NextResponse.json({ ok: true })
}
