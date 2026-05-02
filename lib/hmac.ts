/**
 * Edge-runtime-safe HMAC helpers using the Web Crypto API.
 * All functions are async because crypto.subtle is async.
 */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : "0" + hex
  const out = new Uint8Array(clean.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let hex = ""
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0")
  }
  return hex
}

async function importHmacKey(secret: string, algo: "SHA-1" | "SHA-256"): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: { name: algo } },
    false,
    ["sign"],
  )
}

async function hmacHex(secret: string, body: string, algo: "SHA-1" | "SHA-256"): Promise<string> {
  const key = await importHmacKey(secret, algo)
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body))
  return bytesToHex(sig)
}

/** Constant-time string compare. Returns false on length mismatch. */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/** Constant-time hex compare via byte-level XOR. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aB = hexToBytes(a)
  const bB = hexToBytes(b)
  if (aB.length !== bB.length) return false
  let mismatch = 0
  for (let i = 0; i < aB.length; i++) {
    mismatch |= aB[i] ^ bB[i]
  }
  return mismatch === 0
}

/** Vercel: x-vercel-signature is sha1 HMAC of raw body using webhook secret. */
export async function verifyVercelSignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false
  const expected = await hmacHex(secret, rawBody, "SHA-1")
  return timingSafeEqualHex(expected, signature.replace(/^sha1=/, ""))
}

/** Sentry: sentry-hook-signature is sha256 HMAC of raw body using client secret. */
export async function verifySentrySignature(
  rawBody: string,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!signature || !secret) return false
  const expected = await hmacHex(secret, rawBody, "SHA-256")
  return timingSafeEqualHex(expected, signature)
}

/**
 * UptimeRobot doesn't sign by default — we require a shared "x-uptime-secret" header instead.
 * Constant-time string compare.
 */
export function verifyUptimeSecret(provided: string | null, expected: string): boolean {
  if (!provided || !expected) return false
  return timingSafeEqualStr(provided, expected)
}

/** Slack request signing: v0:{ts}:{body} signed sha256 with signing secret. */
export async function verifySlackSignature(
  rawBody: string,
  ts: string | null,
  signature: string | null,
  secret: string,
): Promise<boolean> {
  if (!ts || !signature || !secret) return false
  // Reject requests older than 5 minutes.
  const fiveMin = 60 * 5
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > fiveMin) return false
  const base = `v0:${ts}:${rawBody}`
  const expected = "v0=" + (await hmacHex(secret, base, "SHA-256"))
  return timingSafeEqualStr(expected, signature)
}

/** Sign and verify our own admin cookie. */
export async function signAdminCookie(value: string, secret: string): Promise<string> {
  const sig = await hmacHex(secret, value, "SHA-256")
  return `${value}.${sig}`
}

export async function verifyAdminCookie(signed: string | undefined, secret: string): Promise<boolean> {
  if (!signed || !secret) return false
  const idx = signed.lastIndexOf(".")
  if (idx === -1) return false
  const value = signed.slice(0, idx)
  const sig = signed.slice(idx + 1)
  const expected = await hmacHex(secret, value, "SHA-256")
  return timingSafeEqualStr(expected, sig)
}
