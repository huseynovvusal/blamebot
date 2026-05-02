"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import type { AnalyticsSnapshot } from "@/lib/types"
import { formatDuration } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityIcon, AlertTriangleIcon, ClockIcon, CalendarIcon, type LucideIcon } from "lucide-react"
import { PopCard } from "@/components/pop-card"
import { cn } from "@/lib/utils"

type Card = {
  label: string
  value: string | number
  hint: string
  icon: LucideIcon
  shadow: "ink" | "pink" | "amber" | "mint" | "violet"
  iconBg: string
  pulse: boolean
}

export function StatsRow() {
  const { data, isLoading } = useSWR<AnalyticsSnapshot>("/api/analytics", fetcher, { refreshInterval: 10_000 })

  const cards: Card[] = [
    {
      label: "Active incidents",
      value: data?.totals.active ?? 0,
      hint: "Need attention now",
      icon: AlertTriangleIcon,
      shadow: data?.totals.active ? "pink" : "ink",
      iconBg: "bg-destructive",
      pulse: !!data?.totals.active,
    },
    {
      label: "Today",
      value: data?.totals.today ?? 0,
      hint: "Last 24 hours",
      icon: ActivityIcon,
      shadow: "violet",
      iconBg: "bg-primary text-primary-foreground",
      pulse: false,
    },
    {
      label: "MTTR (7d)",
      value: data?.mttr.weekMs ? formatDuration(data.mttr.weekMs) : "—",
      hint: "Mean time to resolve",
      icon: ClockIcon,
      shadow: "mint",
      iconBg: "bg-success",
      pulse: false,
    },
    {
      label: "30-day total",
      value: data?.totals.thirtyDays ?? 0,
      hint: "Across all sources",
      icon: CalendarIcon,
      shadow: "amber",
      iconBg: "bg-accent",
      pulse: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((c, i) => {
        const Icon = c.icon
        return (
          <PopCard
            key={c.label}
            shadow={c.shadow}
            className="relative pop-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </span>
                {isLoading ? (
                  <Skeleton className="h-7 w-16" />
                ) : (
                  <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {c.value}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground leading-tight">{c.hint}</span>
              </div>
              <div className="relative shrink-0">
                <span
                  className={cn(
                    "inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground",
                    c.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.75} />
                </span>
                {c.pulse ? (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-foreground pulse-dot" />
                ) : null}
              </div>
            </div>
          </PopCard>
        )
      })}
    </div>
  )
}
