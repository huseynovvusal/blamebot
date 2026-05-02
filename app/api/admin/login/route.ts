import { type NextRequest, NextResponse } from "next/server"
import { checkAdminToken, isAdminConfigured, setAdminCookie } from "@/lib/admin-auth"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_TOKEN in your environment variables." },
      { status: 503 },
    )
  }
  let body: { token?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }
  if (!body.token || !checkAdminToken(body.token)) {
    return NextResponse.json({ error: "Wrong token." }, { status: 401 })
  }
  try {
    await setAdminCookie()
  } catch {
    return NextResponse.json({ error: "Failed to set cookie" }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
