import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function client(): Redis {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) throw new Error("KV not configured")
  return new Redis({ url, token })
}

const VALID_INTEGRATIONS = ["slack", "github", "vercel", "sentry", "uptime"] as const
type Integration = (typeof VALID_INTEGRATIONS)[number]

function credentialKey(integration: Integration): string {
  return `credentials:${integration}`
}

// Save credentials
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { integration, credentials } = body as { integration: string; credentials: Record<string, string> }

    if (!VALID_INTEGRATIONS.includes(integration as Integration)) {
      return NextResponse.json({ error: "Invalid integration" }, { status: 400 })
    }

    // Validate required fields per integration
    const required: Record<Integration, string[]> = {
      slack: ["botToken", "signingSecret", "channelId"],
      github: ["token", "owner", "repo"],
      vercel: ["token", "projectId"],
      sentry: ["clientSecret"],
      uptime: ["secret"],
    }

    const missing = required[integration as Integration].filter(
      (k) => !credentials[k] || credentials[k].trim() === ""
    )

    // Allow partial updates for optional fields (teamId in vercel)
    if (integration === "vercel") {
      const idx = missing.indexOf("teamId")
      if (idx > -1) missing.splice(idx, 1)
    }

    if (missing.length > 0 && integration !== "vercel") {
      return NextResponse.json({ error: `Missing: ${missing.join(", ")}` }, { status: 400 })
    }

    // Store encrypted/hashed in production - for demo we store directly
    // In real app, use encryption at rest
    await client().set(credentialKey(integration as Integration), credentials)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}

// Delete credentials - supports both ?key=slack query param or { integration: "slack" } body
export async function DELETE(req: NextRequest) {
  try {
    // Try query param first
    let integration = req.nextUrl.searchParams.get("key")
    
    // Fall back to body
    if (!integration) {
      try {
        const body = await req.json()
        integration = body.integration
      } catch {
        // No body
      }
    }

    if (!integration || !VALID_INTEGRATIONS.includes(integration as Integration)) {
      return NextResponse.json({ error: "Invalid integration" }, { status: 400 })
    }

    await client().del(credentialKey(integration as Integration))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}

// Get credentials status (not values, for security)
export async function GET() {
  try {
    const r = client()
    const results: Record<Integration, { configured: boolean; meta?: Record<string, string> }> = {
      slack: { configured: false },
      github: { configured: false },
      vercel: { configured: false },
      sentry: { configured: false },
      uptime: { configured: false },
    }

    for (const integration of VALID_INTEGRATIONS) {
      const data = await r.get<Record<string, string>>(credentialKey(integration))
      if (data) {
        results[integration].configured = true
        // Return non-sensitive metadata
        if (integration === "slack" && data.channelId) {
          results[integration].meta = { channelId: data.channelId }
        }
        if (integration === "github" && data.owner && data.repo) {
          results[integration].meta = { owner: data.owner, repo: data.repo }
        }
      }
    }

    return NextResponse.json(results)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 })
  }
}
