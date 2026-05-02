import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { kv } from "@/lib/kv"

// GitHub OAuth - Step 2: Handle callback and exchange code for tokens
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  if (error) {
    return NextResponse.redirect(new URL(`/config?tab=integrations&error=${error}`, req.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/config?tab=integrations&error=missing_params", req.url))
  }

  // Verify state
  const c = await cookies()
  const savedState = c.get("github_oauth_state")?.value
  c.delete("github_oauth_state")

  if (state !== savedState) {
    return NextResponse.redirect(new URL("/config?tab=integrations&error=invalid_state", req.url))
  }

  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/config?tab=integrations&error=missing_config", req.url))
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error("GitHub OAuth error:", tokenData.error_description)
      return NextResponse.redirect(new URL(`/config?tab=integrations&error=${tokenData.error}`, req.url))
    }

    // Get user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/vnd.github+json",
      },
    })
    const userData = await userRes.json()

    // Store tokens securely in KV
    await kv.credentials.set("github", {
      accessToken: tokenData.access_token,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      username: userData.login,
      avatarUrl: userData.avatar_url,
      connectedAt: new Date().toISOString(),
    })

    return NextResponse.redirect(new URL("/config?tab=integrations&success=github", req.url))
  } catch (err) {
    console.error("GitHub OAuth exchange failed:", err)
    return NextResponse.redirect(new URL("/config?tab=integrations&error=exchange_failed", req.url))
  }
}
