"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import type { Incident, TimelineEvent } from "@/lib/types"
import { Activity } from "lucide-react"
import { relativeTime } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { PopCard } from "@/components/pop-card"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<TimelineEvent["kind"], string> = {
  created: "Detected",
  ai_report: "AI report",
  slack_post: "Slack post",
  slack_reply: "Reply",
  acknowledged: "Acknowledged",
  rollback: "Rollback",
  hotfix: "Hotfix",
  autopilot: "Autopilot",
  escalation: "Escalated",
  resolved: "Resolved",
  postmortem: "Postmortem",
  system: "System",
}

const KIND_DOT: Record<TimelineEvent["kind"], string> = {
  created: "bg-destructive",
  ai_report: "bg-primary",
  slack_post: "bg-info",
  slack_reply: "bg-info",
  acknowledged: "bg-info",
  rollback: "bg-destructive",
  hotfix: "bg-accent",
  autopilot: "bg-primary",
  escalation: "bg-destructive",
  resolved: "bg-success",
  postmortem: "bg-success",
  system: "bg-secondary",
}

export function ActivityFeed() {
  const { data, isLoading } = useSWR<{ items: Incident[] }>("/api/incidents?limit=20", fetcher, {
    refreshInterval: 8_000,
  })

  const events = (data?.items ?? [])
    .flatMap((i) =>
      i.timeline.map((t) => ({
        ...t,
        incidentId: i.id,
        incidentTitle: i.title,
        severity: i.severity,
      })),
    )
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 12)

  return (
    <PopCard shadow="ink">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-card">
          <Activity className="h-3.5 w-3.5" strokeWidth={2.75} />
        </span>
        <h2 className="font-display text-lg font-extrabold">Recent activity</h2>
      </div>
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="relative flex flex-col">
          <span aria-hidden className="absolute left-[7px] top-3 bottom-3 w-0.5 bg-foreground/20" />
          {events.map((e) => (
            <li key={e.id} className="relative flex items-start gap-3 py-2 text-sm">
              <span
                className={cn(
                  "relative z-10 mt-1.5 inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-foreground",
                  KIND_DOT[e.kind] ?? "bg-secondary",
                )}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border-2 border-foreground bg-card px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest">
                    {KIND_LABEL[e.kind] ?? e.kind}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">{relativeTime(e.ts)}</span>
                </div>
                <p className="mt-0.5 truncate">
                  <Link href={`/incidents/${e.incidentId}`} className="hover:underline decoration-2 underline-offset-2">
                    {e.message}
                  </Link>{" "}
                  <span className="text-muted-foreground">— {e.incidentTitle}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </PopCard>
  )
}
