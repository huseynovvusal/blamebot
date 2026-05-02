import { type NextRequest, NextResponse } from "next/server"
import { after } from "next/server"
import { verifyUptimeSecret } from "@/lib/hmac"
import { processIncident } from "@/lib/pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const secret = process.env.UPTIMEROBOT_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers.get("x-uptime-secret")
    if (!verifyUptimeSecret(provided, secret)) {
      return NextResponse.json({ error: "invalid secret" }, { status: 401 })
    }
  }
  let body: Record<string, unknown> = {}
  try {
    const ct = req.headers.get("content-type") || ""
    if (ct.includes("application/json")) {
      body = await req.json()
    } else {
      const form = await req.formData()
      form.forEach((v, k) => {
        body[k] = typeof v === "string" ? v : ""
      })
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (String(body.alertType ?? body.alert_type ?? "1") === "2") {
    return NextResponse.json({ ok: true, ignored: "recovery" })
  }

  after(async () => {
    try {
      await processIncident({ source: "uptime", body })
    } catch (err) {
      console.error("[v0] uptime pipeline failed", err)
    }
  })

  return NextResponse.json({ ok: true, queued: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: "POST an UptimeRobot webhook here." })
}
