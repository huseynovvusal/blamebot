"use client"

import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { CheckCircle2, AlertCircle, Plug } from "lucide-react"
import { relativeTime, cn } from "@/lib/utils"
import { PopCard } from "@/components/pop-card"

type HealthResponse = {
  integrations: {
    vercel: { lastReceivedAt: string | null }
    sentry: { lastReceivedAt: string | null }
    uptime: { lastReceivedAt: string | null }
  }
  services: { kv: boolean; slack: boolean; github: boolean; vercelApi: boolean; ai: boolean }
}

export function IntegrationsRail() {
  const { data } = useSWR<HealthResponse>("/api/health", fetcher, { refreshInterval: 15_000 })

  const services = [
    { key: "kv", label: "Upstash Redis", ok: data?.services.kv },
    { key: "ai", label: "AI Gateway", ok: data?.services.ai },
    { key: "slack", label: "Slack", ok: data?.services.slack },
    { key: "github", label: "GitHub", ok: data?.services.github },
    { key: "vercelApi", label: "Vercel API", ok: data?.services.vercelApi },
  ] as const

  const sources: Array<{ key: "vercel" | "sentry" | "uptime"; label: string }> = [
    { key: "vercel", label: "Vercel" },
    { key: "sentry", label: "Sentry" },
    { key: "uptime", label: "UptimeRobot" },
  ]

  return (
    <PopCard shadow="violet">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-primary text-primary-foreground">
          <Plug className="h-3.5 w-3.5" strokeWidth={2.75} />
        </span>
        <h2 className="font-display text-lg font-extrabold">Connected services</h2>
      </div>

      <div className="flex flex-col gap-2">
        {services.map((s) => (
          <div
            key={s.key}
            className="flex items-center justify-between rounded-xl border-2 border-foreground bg-card px-3 py-2"
          >
            <span className="text-sm font-semibold">{s.label}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border-2 border-foreground px-2 py-0.5 text-[10px] font-display font-bold uppercase tracking-widest",
                s.ok ? "bg-success" : "bg-secondary text-muted-foreground",
              )}
            >
              {s.ok ? (
                <CheckCircle2 className="h-3 w-3" strokeWidth={3} />
              ) : (
                <AlertCircle className="h-3 w-3" strokeWidth={3} />
              )}
              {s.ok ? "ready" : "off"}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t-2 border-dashed border-foreground/40">
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Last webhook
        </div>
        <div className="flex flex-col gap-1.5">
          {sources.map((src) => {
            const last = data?.integrations[src.key].lastReceivedAt
            return (
              <div key={src.key} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{src.label}</span>
                <span className="text-xs font-mono font-semibold">{last ? relativeTime(last) : "never"}</span>
              </div>
            )
          })}
        </div>
      </div>
    </PopCard>
  )
}
