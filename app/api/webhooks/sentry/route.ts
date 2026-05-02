import { type NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { verifySentrySignature } from "@/lib/hmac"
import { processIncident } from "@/lib/pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const secret = process.env.SENTRY_WEBHOOK_SECRET
  if (secret) {
    const sig = req.headers.get("sentry-hook-signature")
    if (!(await verifySentrySignature(raw, sig, secret))) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 })
    }
  }
  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  after(async () => {
    try {
      await processIncident({ source: "sentry", body })
    } catch (err) {
      console.error("[v0] sentry pipeline failed", err)
    }
  })

  return NextResponse.json({ ok: true, queued: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST a Sentry webhook here." })
}
