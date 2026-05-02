"use client"

import useSWR from "swr"
import Link from "next/link"
import { useState } from "react"
import { fetcher } from "@/lib/fetcher"
import type { Incident, IncidentStatus, Severity } from "@/lib/types"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SeverityPill } from "@/components/severity-pill"
import { StatusPill } from "@/components/status-pill"
import { SourceIcon } from "@/components/source-icon"
import { relativeTime, cn } from "@/lib/utils"
import { Download, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

// Pill-style toggle segment — matches the sticker aesthetic
function FilterPill<T extends string>({
  value,
  current,
  onClick,
  accent,
  children,
}: {
  value: T
  current: T
  onClick: (v: T) => void
  accent?: string
  children: React.ReactNode
}) {
  const active = value === current
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={cn(
        "h-8 px-3 rounded-full border-2 text-xs font-semibold tracking-wide transition-all",
        active
          ? cn("border-foreground text-foreground shadow-[2px_2px_0_0_var(--foreground)]", accent ?? "bg-primary/20")
          : "border-foreground/30 bg-card text-muted-foreground hover:border-foreground/60 hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}

export function IncidentsView() {
  const [severity, setSeverity] = useState<Severity | "all">("all")
  const [status, setStatus] = useState<IncidentStatus | "all">("all")
  const [q, setQ] = useState("")

  const params = new URLSearchParams()
  params.set("limit", "100")
  if (severity !== "all") params.set("severity", severity)
  if (status !== "all") params.set("status", status)
  if (q) params.set("q", q)

  const { data, isLoading } = useSWR<{ items: Incident[] }>(`/api/incidents?${params}`, fetcher, {
    refreshInterval: 10_000,
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <div className="rounded-2xl border-2 border-foreground bg-card shadow-[3px_3px_0_0_var(--foreground)] p-4">
        <div className="flex flex-wrap items-end gap-4">

          {/* Severity filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 pl-0.5">
              Severity
            </span>
            <div className="flex items-center gap-1.5">
              <FilterPill value="all" current={severity} onClick={setSeverity} accent="bg-muted">All</FilterPill>
              <FilterPill value="P1" current={severity} onClick={setSeverity} accent="bg-primary/20">P1</FilterPill>
              <FilterPill value="P2" current={severity} onClick={setSeverity} accent="bg-accent/25">P2</FilterPill>
              <FilterPill value="P3" current={severity} onClick={setSeverity} accent="bg-secondary">P3</FilterPill>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-8 w-px bg-foreground/15" />

          {/* Status filter */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 pl-0.5">
              Status
            </span>
            <div className="flex items-center gap-1.5">
              <FilterPill value="all" current={status} onClick={setStatus} accent="bg-muted">All</FilterPill>
              <FilterPill value="active" current={status} onClick={setStatus} accent="bg-primary/20">Active</FilterPill>
              <FilterPill value="acknowledged" current={status} onClick={setStatus} accent="bg-info/15">Ack</FilterPill>
              <FilterPill value="resolved" current={status} onClick={setStatus} accent="bg-success/15">Resolved</FilterPill>
            </div>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1.5 min-w-52 flex-1 max-w-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50 pl-0.5">
              Search
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
              <input
                type="search"
                placeholder="title, service, id…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="h-8 w-full rounded-full border-2 border-foreground/40 bg-card pl-8 pr-3 text-sm placeholder:text-foreground/30 focus:outline-none focus:border-foreground focus:shadow-[2px_2px_0_0_var(--foreground)] transition-all"
              />
            </div>
          </div>

          {/* Export */}
          <a
            href={`/api/incidents/export?${params}`}
            download
            className="ml-auto self-end inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border-2 border-foreground bg-foreground text-background text-xs font-semibold shadow-[2px_2px_0_0_hsl(var(--background))] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        {isLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No incidents match</EmptyTitle>
              <EmptyDescription>Try clearing filters or seeding demo data.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Severity</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden md:table-cell">Source</TableHead>
                <TableHead className="hidden md:table-cell">Service</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead className="text-right">Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((i) => (
                <TableRow key={i.id} className="cursor-pointer">
                  <TableCell>
                    <SeverityPill severity={i.severity} />
                  </TableCell>
                  <TableCell>
                    <StatusPill status={i.status} />
                  </TableCell>
                  <TableCell className="max-w-[420px]">
                    <Link href={`/incidents/${i.id}`} className="block hover:underline">
                      <span className="font-medium">{i.title}</span>
                      <p className="truncate text-xs text-muted-foreground font-mono mt-0.5">{i.errorMessage}</p>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <SourceIcon source={i.source} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {i.service || "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {i.responsibleDevs.map((d) => d.name).join(", ") || "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {relativeTime(i.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
