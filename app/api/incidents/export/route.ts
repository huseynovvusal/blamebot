import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET() {
  const items = await kv.incidents.listSince(Date.now() - 90 * 24 * 60 * 60 * 1000, 1000)
  const header = [
    "id",
    "createdAt",
    "resolvedAt",
    "severity",
    "status",
    "source",
    "service",
    "title",
    "responsibleDevs",
    "url",
  ]
  const rows = items.map((i) => [
    i.id,
    i.createdAt,
    i.resolvedAt ?? "",
    i.severity,
    i.status,
    i.source,
    i.service,
    i.title,
    i.responsibleDevs.map((d) => d.name).join(" "),
    i.url ?? "",
  ])
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="incidents-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
