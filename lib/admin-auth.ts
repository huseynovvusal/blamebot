import { cookies } from "next/headers"
import { signAdminCookie, verifyAdminCookie } from "./hmac"

const COOKIE_NAME = "blamebot_admin"

function getCookieSecret(): string {
  return process.env.ADMIN_COOKIE_SECRET || process.env.ADMIN_TOKEN || "dev-only-blamebot-secret"
}

export function isAdminConfigured(): boolean {
  return !!process.env.ADMIN_TOKEN
}

export function checkAdminToken(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN
  if (!expected) return false
  if (token.length !== expected.length) return false
  let mismatch = 0
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

export async function setAdminCookie(): Promise<void> {
  const value = `admin.${Date.now()}`
  const signed = await signAdminCookie(value, getCookieSecret())
  const c = await cookies()
  // SameSite=None + Secure is required so the cookie is sent back when this
  // app is hosted inside an iframe (v0 preview, embeds, etc). Because we sign
  // the cookie with HMAC we can use SameSite=None safely — forging the cookie
  // requires the secret, not the cookie itself.
  c.set(COOKIE_NAME, signed, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearAdminCookie(): Promise<void> {
  const c = await cookies()
  c.delete(COOKIE_NAME)
}

export async function isAdminFromCookies(): Promise<boolean> {
  const c = await cookies()
  const cookie = c.get(COOKIE_NAME)?.value
  return verifyAdminCookie(cookie, getCookieSecret())
}

/** For middleware (where we already have the cookie value as a string). */
export async function isAdminCookieValid(cookieValue: string | undefined): Promise<boolean> {
  return verifyAdminCookie(cookieValue, getCookieSecret())
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME
