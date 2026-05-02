import { type NextRequest, NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import type { Severity, IncidentStatus } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? "25")))
  const cursor = sp.get("cursor") ? Number(sp.get("cursor")) : undefined
  const severity = (sp.get("severity") as Severity | null) || undefined
  const service = sp.get("service") || undefined
  const status = (sp.get("status") as IncidentStatus | null) || undefined
  const sinceMs = sp.get("since") ? Number(sp.get("since")) : undefined
  const search = (sp.get("q") || "").toLowerCase().trim()

  const { items, nextCursor } = await kv.incidents.list({
    limit: search ? Math.max(limit, 100) : limit,
    cursor,
    severity,
    service,
    status,
    sinceMs,
  })

  const filtered = search
    ? items.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          i.errorMessage.toLowerCase().includes(search) ||
          i.service.toLowerCase().includes(search) ||
          i.id.includes(search),
      )
    : items

  return NextResponse.json({ items: filtered.slice(0, limit), nextCursor })
}
