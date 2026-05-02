"use client"

import useSWR from "swr"
import Link from "next/link"
import { fetcher } from "@/lib/fetcher"
import type { Incident } from "@/lib/types"
import { SeverityPill } from "@/components/severity-pill"
import { StatusPill } from "@/components/status-pill"
import { SourceIcon } from "@/components/source-icon"
import { relativeTime } from "@/lib/utils"
import { ChevronRight, FlameIcon } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { PopCard } from "@/components/pop-card"
import { Triangle } from "@/components/decorations"

export function LiveIncidentFeed() {
  const { data, isLoading } = useSWR<{ items: Incident[] }>("/api/incidents?limit=8", fetcher, {
    refreshInterval: 5_000,
  })

  return (
    <PopCard shadow="ink" padded={false} className="relative overflow-hidden">
      <Triangle
        tone="pink"
        size={20}
        rotate={18}
        className="absolute right-4 top-4 hidden sm:block float-slow pointer-events-none"
      />
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-destructive">
            <FlameIcon className="h-4 w-4" strokeWidth={2.75} />
          </span>
          <h2 className="font-display text-lg font-extrabold">Live incident feed</h2>
        </div>
        <Link
          href="/incidents"
          className="inline-flex items-center gap-1 rounded-full border-2 border-foreground bg-card px-3 py-1 text-xs font-display font-bold hover:bg-accent transition-colors"
        >
          View all <ChevronRight className="h-3 w-3" strokeWidth={2.75} />
        </Link>
      </div>

      {isLoading ? (
        <div className="p-5 flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="font-display text-xl font-extrabold">All clear</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No incidents yet. Hit{" "}
            <span className="rounded border-2 border-foreground bg-card px-1.5 py-0.5 font-mono font-semibold">
              Load demo data
            </span>{" "}
            above to populate.
          </p>
        </div>
      ) : (
        <ul className="divide-y-2 divide-border-soft">
          {data.items.map((i) => (
            <li key={i.id}>
              <Link
                href={`/incidents/${i.id}`}
                className="flex items-start gap-4 px-5 py-4 hover:bg-accent/40 transition-colors group"
              >
                <div className="pt-0.5 shrink-0">
                  <SeverityPill severity={i.severity} pulse={i.status === "active"} />
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-1">
                  <span className="font-display font-bold truncate group-hover:underline decoration-2 underline-offset-2">
                    {i.title}
                  </span>
                  <p className="text-xs text-muted-foreground truncate font-mono">{i.errorMessage}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                    <SourceIcon source={i.source} />
                    <span className="text-[11px] text-muted-foreground">·</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{relativeTime(i.createdAt)}</span>
                    {i.responsibleDevs?.length ? (
                      <>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">
                          {i.responsibleDevs.map((d) => d.name).join(", ")}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <StatusPill status={i.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PopCard>
  )
}
