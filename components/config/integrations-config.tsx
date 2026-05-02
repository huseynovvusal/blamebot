"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { useSearchParams } from "next/navigation"
import { fetcher } from "@/lib/fetcher"
import { ConfigPanel } from "./shared"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  Slack,
  Github,
  Server,
  Database,
  Zap,
  Bell,
  Shield,
  Loader2,
  Unplug,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Demo mode simulates all integrations as connected
const DEMO_MODE_KEY = "blamebot-demo-mode"

type IntegrationCredentials = {
  slack: { configured: boolean; teamName?: string; connectedAt?: string }
  github: { configured: boolean; username?: string; connectedAt?: string }
  vercel: { configured: boolean; connectedAt?: string }
  sentry: { configured: boolean; connectedAt?: string }
  uptime: { configured: boolean; connectedAt?: string }
}

type Resp = {
  system: { kv: boolean; aiGateway: boolean }
  credentials: IntegrationCredentials
}

// Demo mode fake credentials
const DEMO_CREDENTIALS: IntegrationCredentials = {
  slack: { configured: true, teamName: "Acme Corp", connectedAt: new Date().toISOString() },
  github: { configured: true, username: "acme-org", connectedAt: new Date().toISOString() },
  vercel: { configured: true, connectedAt: new Date().toISOString() },
  sentry: { configured: true, connectedAt: new Date().toISOString() },
  uptime: { configured: true, connectedAt: new Date().toISOString() },
}

// OAuth-based integrations (one-click connect)
const OAUTH_INTEGRATIONS = [
  {
    key: "slack" as const,
    label: "Slack",
    icon: Slack,
    color: "bg-[#4A154B]",
    description: "Post incident alerts, respond to commands, and interact via buttons",
  },
  {
    key: "github" as const,
    label: "GitHub",
    icon: Github,
    color: "bg-[#24292e]",
    description: "Fetch commits, changed files, and git blame for owner detection",
  },
]

// Webhook-based integrations (manual setup)
const WEBHOOK_INTEGRATIONS = [
  {
    key: "vercel" as const,
    label: "Vercel",
    icon: Server,
    color: "bg-foreground",
    description: "Receive deployment webhooks and trigger rollbacks",
    webhookPath: "/api/webhooks/vercel",
    docsUrl: "https://vercel.com/docs/webhooks",
    steps: [
      "Go to your Vercel project → Settings → Webhooks",
      "Click 'Create Webhook' and paste the URL below",
      "Select events: deployment.created, deployment.error, deployment.succeeded",
    ],
  },
  {
    key: "sentry" as const,
    label: "Sentry",
    icon: Shield,
    color: "bg-[#362D59]",
    description: "Receive error alerts and enrich incident context",
    webhookPath: "/api/webhooks/sentry",
    docsUrl: "https://docs.sentry.io/product/integrations/integration-platform/webhooks/",
    steps: [
      "Go to Sentry → Settings → Developer Settings",
      "Create an Internal Integration named 'BlameBot'",
      "Set the Webhook URL and enable issue/error events",
      "Copy the Client Secret to verify signatures",
    ],
  },
  {
    key: "uptime" as const,
    label: "UptimeRobot",
    icon: Bell,
    color: "bg-[#3BD671]",
    description: "Receive uptime monitor alerts",
    webhookPath: "/api/webhooks/uptime",
    docsUrl: "https://uptimerobot.com/dashboard",
    steps: [
      "Go to UptimeRobot → My Settings → Alert Contacts",
      "Add a new Webhook contact with the URL below",
      "Attach this contact to your monitors",
    ],
  },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded border border-foreground/20 hover:bg-muted transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
    </button>
  )
}

function OAuthCard({
  integration,
  data,
  successKey,
}: {
  integration: (typeof OAUTH_INTEGRATIONS)[0]
  data: IntegrationCredentials[typeof integration.key]
  successKey: string | null
}) {
  const [disconnecting, setDisconnecting] = useState(false)
  const Icon = integration.icon
  const justConnected = successKey === integration.key

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${integration.label}?`)) return
    setDisconnecting(true)
    try {
      await fetch(`/api/config/credentials?key=${integration.key}`, { method: "DELETE" })
      mutate("/api/config/integrations")
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-3 transition-all",
        data.configured ? "border-success/40 bg-success/5" : "border-foreground/15 bg-card"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white", integration.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{integration.label}</span>
            {data.configured && (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </span>
            )}
            {justConnected && (
              <span className="text-xs text-success font-medium animate-pulse">Just connected!</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{integration.description}</p>
          {data.configured && (data as any).teamName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Connected to <span className="font-medium text-foreground">{(data as any).teamName || (data as any).username}</span>
            </p>
          )}
        </div>

        {data.configured ? (
          <button
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border-2 border-foreground/20 text-xs font-medium hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
            Disconnect
          </button>
        ) : (
          <a
            href={`/api/auth/${integration.key}`}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border-2 border-foreground bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
          >
            Connect
          </a>
        )}
      </div>
    </div>
  )
}

function WebhookCard({
  integration,
  data,
  baseUrl,
}: {
  integration: (typeof WEBHOOK_INTEGRATIONS)[0]
  data: IntegrationCredentials[typeof integration.key]
  baseUrl: string
}) {
  const [expanded, setExpanded] = useState(false)
  const Icon = integration.icon
  const webhookUrl = `${baseUrl}${integration.webhookPath}`

  return (
    <div
      className={cn(
        "rounded-xl border-2 overflow-hidden transition-all",
        data.configured ? "border-success/40" : "border-foreground/15"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 hover:bg-secondary/20 transition-colors"
      >
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg text-white", integration.color)}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{integration.label}</span>
            {data.configured ? (
              <span className="inline-flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3 w-3" />
                Receiving
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Not configured
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{integration.description}</p>
        </div>

        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <div className="border-t border-foreground/10 p-3 space-y-3 bg-secondary/10">
          <div>
            <p className="text-xs font-medium mb-1.5">Webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-mono truncate">
                {webhookUrl}
              </code>
              <CopyButton text={webhookUrl} />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5">Setup Steps</p>
            <ol className="space-y-1 text-xs text-muted-foreground list-decimal list-inside">
              {integration.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <a
            href={integration.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View documentation <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  )
}

function SystemStatus({ label, ok, icon: Icon }: { label: string; ok: boolean; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{label}</span>
      {ok ? (
        <CheckCircle2 className="ml-auto h-4 w-4 text-success" />
      ) : (
        <AlertCircle className="ml-auto h-4 w-4 text-muted-foreground/50" />
      )}
    </div>
  )
}

export function IntegrationsConfig() {
  const searchParams = useSearchParams()
  const successKey = searchParams.get("success")
  const { data } = useSWR<Resp>("/api/config/integrations", fetcher, { refreshInterval: 15_000 })
  
  // Demo mode state
  const [demoMode, setDemoMode] = useState(false)
  useEffect(() => {
    setDemoMode(localStorage.getItem(DEMO_MODE_KEY) === "true")
  }, [])
  
  const toggleDemoMode = () => {
    const newValue = !demoMode
    setDemoMode(newValue)
    localStorage.setItem(DEMO_MODE_KEY, String(newValue))
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "https://your-app.vercel.app"

  if (!data) return <Skeleton className="h-96 w-full rounded-2xl" />
  
  // Use demo credentials if demo mode is on
  const credentials = demoMode ? DEMO_CREDENTIALS : data.credentials
  const system = demoMode ? { kv: true, aiGateway: true } : data.system

  const oauthConnected = OAUTH_INTEGRATIONS.filter((i) => credentials[i.key].configured).length
  const webhookConnected = WEBHOOK_INTEGRATIONS.filter((i) => credentials[i.key].configured).length
  const totalConnected = oauthConnected + webhookConnected
  const total = OAUTH_INTEGRATIONS.length + WEBHOOK_INTEGRATIONS.length

  return (
    <ConfigPanel
      title="Integrations"
      description="Connect external services to enable the full incident pipeline."
    >
      {/* Demo mode toggle */}
      <div className="mb-4 flex items-center justify-between rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Demo Mode</p>
            <p className="text-xs text-muted-foreground">Simulate all integrations as connected for demos</p>
          </div>
        </div>
        <Switch checked={demoMode} onCheckedChange={toggleDemoMode} />
      </div>

      {demoMode && (
        <div className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
          Demo mode is on — all integrations appear connected. Turn off to configure real connections.
        </div>
      )}

      {/* System status */}
      <div className="mb-4 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">System</p>
        <SystemStatus label="Database (Upstash)" ok={system.kv} icon={Database} />
        <SystemStatus label="AI Gateway" ok={system.aiGateway} icon={Zap} />
      </div>

      {/* Progress */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-success transition-all"
            style={{ width: `${(totalConnected / total) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">{totalConnected}/{total}</span>
      </div>

      {/* OAuth integrations */}
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">One-Click Connect</p>
        <div className="space-y-2">
          {OAUTH_INTEGRATIONS.map((integration) => (
            <OAuthCard
              key={integration.key}
              integration={integration}
              data={credentials[integration.key]}
              successKey={successKey}
            />
          ))}
        </div>
      </div>

      {/* Webhook integrations */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-2">Webhooks</p>
        <div className="space-y-2">
          {WEBHOOK_INTEGRATIONS.map((integration) => (
            <WebhookCard
              key={integration.key}
              integration={integration}
              data={credentials[integration.key]}
              baseUrl={baseUrl}
            />
          ))}
        </div>
      </div>
    </ConfigPanel>
  )
}
