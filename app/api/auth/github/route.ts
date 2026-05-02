import { NextResponse } from "next/server"
import { nanoid } from "nanoid"
import { cookies } from "next/headers"

// GitHub OAuth - Step 1: Redirect to GitHub authorization
export async function GET() {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_CLIENT_ID not configured. Add it in your Vercel project settings." },
      { status: 503 }
    )
  }

  // Generate state for CSRF protection
  const state = nanoid(32)
  const c = await cookies()
  c.set("github_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  })

  // Scopes needed for BlameBot
  const scopes = ["repo", "read:user"].join(" ")

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/auth/github/callback`
  
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", clientId)
  url.searchParams.set("scope", scopes)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)

  return NextResponse.redirect(url.toString())
}
