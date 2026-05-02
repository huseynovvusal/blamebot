"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import type { AnalyticsSnapshot, HeatmapCell, LeaderboardEntry, ServiceHealth } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDuration, cn } from "@/lib/utils"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { AlertTriangle, ArrowDown, ArrowUp, Minus, Trophy, Zap, Shield, Clock } from "lucide-react"

export function AnalyticsView() {
  const { data, isLoading } = useSWR<AnalyticsSnapshot>("/api/analytics", fetcher, { refreshInterval: 30_000 })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No data</EmptyTitle>
          <EmptyDescription>Could not load analytics. Check your KV connection.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="MTTR (30d)" value={data.mttr.thirtyDayMs ? formatDuration(data.mttr.thirtyDayMs) : "—"} icon={Clock} />
        <KPI label="MTTR (7d)" value={data.mttr.weekMs ? formatDuration(data.mttr.weekMs) : "—"} icon={Zap} />
        <KPI label="30-day total" value={data.totals.thirtyDays} />
        <KPI label="Active now" value={data.totals.active} accent={data.totals.active > 0 ? "destructive" : undefined} />
      </div>

      {/* Main charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-card border-2 border-foreground/15 rounded-2xl lg:col-span-2">
          <CardHeader className="py-2.5 px-4">
            <h2 className="font-semibold">Incidents over time</h2>
            <p className="text-xs text-muted-foreground">Past 30 days, stacked by severity</p>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <ChartContainer
              config={{
                P1: { label: "P1", color: "var(--color-chart-1)" },
                P2: { label: "P2", color: "var(--color-chart-2)" },
                P3: { label: "P3", color: "var(--color-chart-5)" },
              }}
              className="aspect-[3/1] w-full"
            >
              <BarChart data={data.incidentsOverTime}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: string) => v.slice(5)} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="P3" stackId="s" fill="var(--color-P3)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="P2" stackId="s" fill="var(--color-P2)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="P1" stackId="s" fill="var(--color-P1)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <HeatmapCard heatmap={data.heatmap} riskWindows={data.riskWindows} />
      </div>

      {/* Leaderboard + Service Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LeaderboardCard leaderboard={data.leaderboard} />
        <ServiceHealthCard services={data.serviceHealth} />
      </div>

      {/* Files + Services with most incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card border-2 border-foreground/15 rounded-2xl">
          <CardHeader className="py-2.5 px-4">
            <h2 className="font-semibold">Hotspot files</h2>
            <p className="text-xs text-muted-foreground">Files with most incidents</p>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <RankedList items={data.topFiles.map((f) => ({ label: f.path, count: f.count }))} max={data.topFiles[0]?.count ?? 1} mono />
          </CardContent>
        </Card>
        <Card className="bg-card border-2 border-foreground/15 rounded-2xl">
          <CardHeader className="py-2.5 px-4">
            <h2 className="font-semibold">Services by incident count</h2>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <RankedList items={data.topServices.map((s) => ({ label: s.service, count: s.count }))} max={data.topServices[0]?.count ?? 1} />
          </CardContent>
        </Card>
      </div>

      {/* Reliability Scoreboard */}
      <Card className="bg-card border-2 border-foreground/15 rounded-2xl">
        <CardHeader className="py-2.5 px-4">
          <h2 className="font-semibold">Reliability scoreboard</h2>
          <p className="text-xs text-muted-foreground">Higher is better. Penalties for incidents caused; bonuses for resolutions and postmortems.</p>
        </CardHeader>
        <CardContent className="pb-3 px-4">
          {data.devScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No engineers tracked yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {data.devScores.map((d) => (
                <div key={d.slackUserId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.name}</span>
                    <span className={cn("font-mono text-sm", d.reliabilityScore >= 80 ? "text-success" : d.reliabilityScore >= 60 ? "text-accent" : "text-primary")}>
                      {d.reliabilityScore}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", d.reliabilityScore >= 80 ? "bg-success" : d.reliabilityScore >= 60 ? "bg-accent" : "bg-primary")}
                      style={{ width: `${d.reliabilityScore}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                    <span>{d.caused} caused</span>
                    <span>·</span>
                    <span>{d.resolved} resolved</span>
                    <span>·</span>
                    <span>{d.postmortemsWritten} postmortems</span>
                    {d.avgResponseMs ? (
                      <>
                        <span>·</span>
                        <span>avg {formatDuration(d.avgResponseMs)}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function KPI({ label, value, accent, icon: Icon }: { label: string; value: string | number; accent?: "destructive"; icon?: React.ElementType }) {
  return (
    <Card className="px-4 py-3 bg-card border-2 border-foreground/15 rounded-2xl">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <div className={cn("mt-1 font-mono text-2xl font-semibold tracking-tight", accent === "destructive" && "text-primary")}>{value}</div>
    </Card>
  )
}

function HeatmapCard({ heatmap, riskWindows }: { heatmap: HeatmapCell[]; riskWindows: AnalyticsSnapshot["riskWindows"] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const grid: HeatmapCell[][] = Array.from({ length: 7 }, () => [])
  for (const cell of heatmap) grid[cell.dow].push(cell)

  const riskColors: Record<HeatmapCell["riskLevel"], string> = {
    safe: "bg-secondary",
    low: "bg-success/30",
    medium: "bg-accent/50",
    high: "bg-primary/60",
    critical: "bg-primary",
  }

  return (
    <Card className="bg-card border-2 border-foreground/15 rounded-2xl">
      <CardHeader className="py-2.5 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">When incidents happen</h2>
            <p className="text-xs text-muted-foreground">Day × hour heatmap</p>
          </div>
          {riskWindows.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="font-medium">{riskWindows.length} risk windows</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className="flex flex-col gap-1">
          {grid.map((row, dow) => (
            <div key={dow} className="flex items-center gap-1">
              <span className="w-8 text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{days[dow]}</span>
              <div className="flex gap-px flex-1">
                {row.map((cell) => (
                  <div
                    key={cell.hour}
                    className={cn("flex-1 h-3 rounded-[2px] transition-colors", riskColors[cell.riskLevel])}
                    title={`${days[dow]} ${cell.hour}:00 — ${cell.count} incidents (${cell.riskLevel})`}
                  />
                ))}
              </div>
            </div>
          ))}
          <div className="ml-9 mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>0</span>
            <span>6</span>
            <span>12</span>
            <span>18</span>
            <span>23</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-3">
          {(["safe", "low", "medium", "high", "critical"] as const).map((level) => (
            <div key={level} className="flex items-center gap-1.5">
              <div className={cn("h-2.5 w-2.5 rounded-sm", riskColors[level])} />
              <span className="text-[10px] text-muted-foreground capitalize">{level}</span>
            </div>
          ))}
        </div>

        {/* Risk windows */}
        {riskWindows.length > 0 && (
          <div className="mt-4 pt-4 border-t border-foreground/10">
            <p className="text-xs font-medium text-foreground mb-2">Avoid deploying during:</p>
            <div className="flex flex-wrap gap-2">
              {riskWindows.map((w, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 border border-primary/30 text-[11px] font-medium text-primary">
                  <AlertTriangle className="h-3 w-3" />
                  {w.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LeaderboardCard({ leaderboard }: { leaderboard: LeaderboardEntry[] }) {
  if (leaderboard.length === 0) {
    return (
      <Card className="bg-card border-2 border-foreground/15 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Trophy className="h-5 w-5" />
          <span>No resolutions yet — leaderboard will appear here.</span>
        </div>
      </Card>
    )
  }

  const trendIcon = (trend: LeaderboardEntry["trend"]) => {
    if (trend === "up") return <ArrowUp className="h-3 w-3 text-success" />
    if (trend === "down") return <ArrowDown className="h-3 w-3 text-primary" />
    return <Minus className="h-3 w-3 text-muted-foreground" />
  }

  const rankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-lg">🥇</span>
    if (rank === 2) return <span className="text-lg">🥈</span>
    if (rank === 3) return <span className="text-lg">🥉</span>
    return <span className="text-sm font-mono text-muted-foreground">#{rank}</span>
  }

  return (
    <Card className="bg-card border-2 border-foreground/15 rounded-2xl">
      <CardHeader className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <h2 className="font-semibold">Resolution leaderboard</h2>
        </div>
        <p className="text-xs text-muted-foreground">Top responders by resolutions and MTTR</p>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className="flex flex-col gap-2">
          {leaderboard.map((entry) => (
            <div key={entry.slackUserId} className={cn("flex items-center gap-3 p-2 rounded-xl transition-colors", entry.rank <= 3 && "bg-accent/5")}>
              <div className="w-8 flex justify-center">{rankBadge(entry.rank)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{entry.name}</span>
                  {trendIcon(entry.trend)}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span>{entry.resolved} resolved</span>
                  {entry.avgMttrMs && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(entry.avgMttrMs)} avg</span>
                    </>
                  )}
                  {entry.streak > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-success">{entry.streak} streak</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ServiceHealthCard({ services }: { services: ServiceHealth[] }) {
  if (services.length === 0) {
    return (
      <Card className="bg-card border-2 border-foreground/15 rounded-2xl p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-5 w-5" />
          <span>No service data yet.</span>
        </div>
      </Card>
    )
  }

  const healthColor = (score: number) => {
    if (score >= 80) return "text-success bg-success/10 border-success/30"
    if (score >= 60) return "text-accent bg-accent/10 border-accent/30"
    if (score >= 40) return "text-primary bg-primary/10 border-primary/30"
    return "text-primary bg-primary/20 border-primary/50"
  }

  return (
    <Card className="bg-card border-2 border-foreground/15 rounded-2xl">
      <CardHeader className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-info" />
          <h2 className="font-semibold">Service health</h2>
        </div>
        <p className="text-xs text-muted-foreground">Services ranked by health score (lowest first)</p>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        <div className="flex flex-col gap-2">
          {services.map((s) => (
            <div key={s.service} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/30 transition-colors">
              <div className={cn("flex items-center justify-center h-9 w-9 rounded-lg border font-mono text-sm font-semibold", healthColor(s.healthScore))}>
                {s.healthScore}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{s.service}</div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                  <span>{s.incidentCount} incidents</span>
                  <span>·</span>
                  <span className="text-primary">{s.p1Count} P1</span>
                  <span className="text-accent">{s.p2Count} P2</span>
                  <span>{s.p3Count} P3</span>
                  {s.avgMttrMs && (
                    <>
                      <span>·</span>
                      <span>{formatDuration(s.avgMttrMs)} MTTR</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RankedList({ items, max, mono }: { items: { label: string; count: number }[]; max: number; mono?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.label} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-sm">
            <span className={cn("truncate min-w-0 mr-2", mono && "font-mono text-xs")}>{i.label}</span>
            <span className="font-mono text-xs text-muted-foreground shrink-0">{i.count}</span>
          </div>
          <div className="h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary/60" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
