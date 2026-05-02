import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { kv } from "@/lib/kv"

// Slack OAuth 2.0 - Step 2: Handle callback and exchange code for tokens
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // Check for errors from Slack
  if (error) {
    return NextResponse.redirect(new URL(`/config?tab=integrations&error=${error}`, req.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/config?tab=integrations&error=missing_params", req.url))
  }

  // Verify state for CSRF protection
  const c = await cookies()
  const savedState = c.get("slack_oauth_state")?.value
  c.delete("slack_oauth_state")

  if (state !== savedState) {
    return NextResponse.redirect(new URL("/config?tab=integrations&error=invalid_state", req.url))
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/config?tab=integrations&error=missing_config", req.url))
  }

  try {
    // Exchange code for access token
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/slack/callback`
    
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const data = await tokenRes.json()

    if (!data.ok) {
      console.error("Slack OAuth error:", data.error)
      return NextResponse.redirect(new URL(`/config?tab=integrations&error=${data.error}`, req.url))
    }

    // Store tokens securely in KV
    await kv.credentials.set("slack", {
      accessToken: data.access_token,
      teamId: data.team?.id,
      teamName: data.team?.name,
      botUserId: data.bot_user_id,
      scope: data.scope,
      connectedAt: new Date().toISOString(),
    })

    // Also store the default channel if available
    if (data.incoming_webhook?.channel_id) {
      await kv.credentials.set("slack_channel", {
        channelId: data.incoming_webhook.channel_id,
        channelName: data.incoming_webhook.channel,
      })
    }

    return NextResponse.redirect(new URL("/config?tab=integrations&success=slack", req.url))
  } catch (err) {
    console.error("Slack OAuth exchange failed:", err)
    return NextResponse.redirect(new URL("/config?tab=integrations&error=exchange_failed", req.url))
  }
}
