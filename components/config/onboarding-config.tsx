"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/fetcher"
import { ConfigPanel } from "./shared"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle2,
  ArrowRight,
  Rocket,
  Database,
  Users,
  AlertTriangle,
  Clock,
  Slack,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const DEMO_MODE_KEY = "blamebot-demo-mode"

type IntegrationsResp = {
  system: { kv: boolean; aiGateway: boolean }
  credentials: {
    slack: { configured: boolean }
    github: { configured: boolean }
    vercel: { configured: boolean }
    sentry: { configured: boolean }
    uptime: { configured: boolean }
  }
}

type CheckData = {
  integrations: IntegrationsResp
  hasOwners: boolean
  hasSeverity: boolean
  hasEscalation: boolean
  hasIncidents: boolean
}

type Step = {
  id: string
  title: string
  description: string
  icon: React.ElementType
  href?: string
  check: (data: CheckData) => boolean
}

const steps: Step[] = [
  {
    id: "kv",
    title: "Connect Upstash Redis",
    description: "Required for storing incidents, configs, and analytics.",
    icon: Database,
    check: (d) => d.integrations.system.kv,
  },
  {
    id: "owners",
    title: "Configure owner rules",
    description: "Map file patterns to responsible engineers so BlameBot knows who to page.",
    icon: Users,
    href: "/config?tab=owners",
    check: (d) => d.hasOwners,
  },
  {
    id: "severity",
    title: "Set up severity rules",
    description: "Auto-classify incidents as P1/P2/P3 based on error patterns.",
    icon: AlertTriangle,
    href: "/config?tab=severity",
    check: (d) => d.hasSeverity,
  },
  {
    id: "escalation",
    title: "Define escalation chain",
    description: "Configure who gets paged and when if incidents aren't acknowledged.",
    icon: Clock,
    href: "/config?tab=escalation",
    check: (d) => d.hasEscalation,
  },
  {
    id: "slack",
    title: "Connect Slack",
    description: "Post incidents to a channel and respond to commands.",
    icon: Slack,
    href: "/config?tab=integrations",
    check: (d) => d.integrations.credentials.slack.configured,
  },
  {
    id: "webhooks",
    title: "Set up webhooks",
    description: "Connect Vercel, Sentry, or UptimeRobot to trigger incidents.",
    icon: Zap,
    href: "/config?tab=integrations",
    check: (d) => 
      d.integrations.credentials.vercel.configured || 
      d.integrations.credentials.sentry.configured || 
      d.integrations.credentials.uptime.configured ||
      d.hasIncidents,
  },
]

export function OnboardingConfig() {
  const { data: integrations } = useSWR<IntegrationsResp>("/api/config/integrations", fetcher)
  const { data: owners } = useSWR<{ rules?: unknown[] }>("/api/config/owners", fetcher)
  const { data: severity } = useSWR<{ rules?: unknown[] }>("/api/config/severity", fetcher)
  const { data: escalation } = useSWR<{ levels?: unknown[] }>("/api/config/escalation", fetcher)
  const { data: incidents } = useSWR<{ items?: unknown[] }>("/api/incidents?limit=1", fetcher)
  
  // Demo mode — simulate all integrations connected
  const [demoMode, setDemoMode] = useState(false)
  useEffect(() => {
    setDemoMode(localStorage.getItem(DEMO_MODE_KEY) === "true")
  }, [])

  if (!integrations) return <Skeleton className="h-96 w-full rounded-2xl" />

  // In demo mode, all integrations appear configured
  const effectiveIntegrations: IntegrationsResp = demoMode
    ? {
        system: { kv: true, aiGateway: true },
        credentials: {
          slack: { configured: true },
          github: { configured: true },
          vercel: { configured: true },
          sentry: { configured: true },
          uptime: { configured: true },
        },
      }
    : integrations

  const checkData: CheckData = {
    integrations: effectiveIntegrations,
    hasOwners: demoMode || (Array.isArray(owners?.rules) && owners.rules.length > 0),
    hasSeverity: demoMode || (Array.isArray(severity?.rules) && severity.rules.length > 0),
    hasEscalation: demoMode || (Array.isArray(escalation?.levels) && escalation.levels.length > 0),
    hasIncidents: demoMode || (Array.isArray(incidents?.items) && incidents.items.length > 0),
  }

  const completedCount = steps.filter((s) => s.check(checkData)).length
  const allComplete = completedCount === steps.length

  return (
    <ConfigPanel
      title="Getting Started"
      description="Complete these steps to get BlameBot fully operational."
    >
      {/* Progress ring */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-secondary"
            />
            <circle
              cx="48"
              cy="48"
              r="40"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - completedCount / steps.length)}
              strokeLinecap="round"
              className="text-success transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{completedCount}</span>
            <span className="text-[10px] text-muted-foreground">of {steps.length}</span>
          </div>
        </div>
      </div>

      {allComplete ? (
        <div className="rounded-xl border-2 border-success bg-success/10 p-4 text-center mb-4">
          <Rocket className="h-8 w-8 text-success mx-auto mb-2" />
          <h3 className="font-bold mb-0.5">All set!</h3>
          <p className="text-sm text-muted-foreground mb-3">
            BlameBot is fully configured and ready.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-foreground text-background px-4 py-1.5 text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const complete = step.check(checkData)
          const Icon = step.icon
          const content = (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border-2 p-3 transition-all",
                complete
                  ? "border-success/50 bg-success/5"
                  : "border-foreground/15 bg-card hover:border-foreground/30",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2",
                  complete
                    ? "border-success bg-success/20 text-success"
                    : "border-foreground/20 bg-muted text-muted-foreground",
                )}
              >
                {complete ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground">STEP {i + 1}</span>
                  {complete && <span className="text-[9px] font-bold text-success">DONE</span>}
                </div>
                <h4 className={cn("text-sm font-semibold", complete && "text-muted-foreground")}>
                  {step.title}
                </h4>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>

              {step.href && !complete && (
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1.5" />
              )}
            </div>
          )

          if (step.href && !complete) {
            return (
              <Link key={step.id} href={step.href} className="block">
                {content}
              </Link>
            )
          }
          return <div key={step.id}>{content}</div>
        })}
      </div>

      {/* Quick actions */}
      {!allComplete && (
        <div className="mt-4 pt-4 border-t border-foreground/10">
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/seed"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground/20 bg-card px-3 py-1 text-xs font-medium hover:border-foreground/40 transition-colors"
            >
              Load demo data
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground/20 bg-card px-3 py-1 text-xs font-medium hover:border-foreground/40 transition-colors"
            >
              View dashboard
            </Link>
          </div>
        </div>
      )}
    </ConfigPanel>
  )
}
