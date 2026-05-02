import { NextResponse } from "next/server"
import { kv, kvHealthcheck } from "@/lib/kv"
import { isSlackConfigured } from "@/lib/slack/client"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Public-ish: read-only, no secrets — used by the dashboard sidebar.
export async function GET() {
  const integrations = await kv.config.integrations.get()
  const kvHealth = await kvHealthcheck()
  return NextResponse.json({
    integrations,
    services: {
      kv: kvHealth.ok,
      slack: isSlackConfigured(),
      github: !!process.env.GITHUB_TOKEN && !!process.env.GITHUB_OWNER && !!process.env.GITHUB_REPO,
      vercelApi: !!process.env.VERCEL_API_TOKEN && !!process.env.VERCEL_PROJECT_ID,
      ai: true, // AI Gateway is auto on Vercel
    },
  })
}
