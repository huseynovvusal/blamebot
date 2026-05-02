"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import type { AnalyticsSnapshot } from "@/lib/types"
import { Trophy } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { PopCard } from "@/components/pop-card"

export function TopOffenders() {
  const { data, isLoading } = useSWR<AnalyticsSnapshot>("/api/analytics", fetcher, { refreshInterval: 30_000 })

  return (
    <PopCard shadow="amber">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-accent text-accent-foreground">
          <Trophy className="h-3.5 w-3.5" strokeWidth={2.75} />
        </span>
        <h2 className="font-display text-lg font-extrabold">Reliability scores</h2>
      </div>
      <div className="flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : !data?.devScores.length ? (
          <p className="text-sm text-muted-foreground">No data yet. Trigger an incident or seed demo data.</p>
        ) : (
          data.devScores.slice(0, 5).map((d, idx) => {
            const rankBg = idx === 0 ? "bg-success" : idx === 1 ? "bg-accent" : idx === 2 ? "bg-info" : "bg-card"
            return (
              <div
                key={d.slackUserId}
                className="rounded-xl border-2 border-foreground bg-card p-3 hover:-rotate-[0.5deg] transition-transform"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground font-display font-extrabold text-sm shrink-0",
                      rankBg,
                    )}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold truncate">{d.name}</span>
                      <span
                        className={cn(
                          "rounded-full border-2 border-foreground px-2 py-0.5 font-mono text-[10px] font-bold",
                          d.reliabilityScore >= 80
                            ? "bg-success"
                            : d.reliabilityScore >= 60
                              ? "bg-accent"
                              : "bg-destructive",
                        )}
                      >
                        {d.reliabilityScore}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full border-2 border-foreground bg-card overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          d.reliabilityScore >= 80
                            ? "bg-success"
                            : d.reliabilityScore >= 60
                              ? "bg-accent"
                              : "bg-destructive",
                        )}
                        style={{ width: `${Math.max(8, d.reliabilityScore)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground font-mono">
                      <span>{d.caused} caused</span>
                      <span>{d.resolved} resolved</span>
                      <span>{d.postmortemsWritten} pm</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </PopCard>
  )
}
