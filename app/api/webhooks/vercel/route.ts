import { type NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { verifyVercelSignature } from "@/lib/hmac"
import { processIncident } from "@/lib/pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const secret = process.env.VERCEL_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers.get("x-vercel-signature")
    if (!(await verifyVercelSignature(raw, sig, secret))) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  }
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const type = String((body as { type?: string }).type ?? "")
  if (!type.startsWith("deployment.error") && !type.startsWith("deployment.failed") && !type.includes("error")) {
    return NextResponse.json({ ok: true, ignored: true, type })
  }

  // Acknowledge immediately. Run the AI pipeline in the background so we never
  // block Vercel's webhook retry budget on a 5–15s LLM call.
  after(async () => {
    try {
      await processIncident({ source: "vercel", body })
    } catch (err) {
      console.error("[v0] vercel pipeline failed", err)
    }
  })

  return NextResponse.json({ ok: true, queued: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST a Vercel webhook here." })
}
