import { NextResponse } from "next/server"
import { kv, kvHealthcheck } from "@/lib/kv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const kvHealth = await kvHealthcheck()

  // Check OAuth credentials stored in KV (user-connected via OAuth flows)
  const [slackCreds, githubCreds, vercelCreds, sentryCreds, uptimeCreds, webhookStatus] = await Promise.all([
    kv.credentials.get<{ accessToken?: string; teamName?: string; connectedAt?: string }>("slack"),
    kv.credentials.get<{ accessToken?: string; username?: string; connectedAt?: string }>("github"),
    kv.credentials.get<{ connectedAt?: string }>("vercel"),
    kv.credentials.get<{ connectedAt?: string }>("sentry"),
    kv.credentials.get<{ connectedAt?: string }>("uptime"),
    kv.config.integrations.get(),
  ])

  return NextResponse.json({
    system: {
      kv: kvHealth.ok,
      aiGateway: true, // Always available on Vercel
    },
    credentials: {
      slack: {
        configured: !!slackCreds?.accessToken,
        teamName: slackCreds?.teamName,
        connectedAt: slackCreds?.connectedAt,
      },
      github: {
        configured: !!githubCreds?.accessToken,
        username: githubCreds?.username,
        connectedAt: githubCreds?.connectedAt,
      },
      vercel: {
        // Vercel is configured if we've received webhooks from it
        configured: !!webhookStatus.vercel.lastReceivedAt,
        connectedAt: webhookStatus.vercel.lastReceivedAt,
      },
      sentry: {
        configured: !!webhookStatus.sentry.lastReceivedAt,
        connectedAt: webhookStatus.sentry.lastReceivedAt,
      },
      uptime: {
        configured: !!webhookStatus.uptime.lastReceivedAt,
        connectedAt: webhookStatus.uptime.lastReceivedAt,
      },
    },
  })
}
