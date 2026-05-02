import { CloudIcon, BugIcon, GaugeIcon, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const MAP: Record<string, { icon: LucideIcon; label: string; bg: string }> = {
  vercel: { icon: CloudIcon, label: "Vercel", bg: "bg-foreground text-background" },
  sentry: { icon: BugIcon, label: "Sentry", bg: "bg-accent text-accent-foreground" },
  uptime: { icon: GaugeIcon, label: "UptimeRobot", bg: "bg-info text-foreground" },
}

export function SourceIcon({ source, className }: { source: string; className?: string }) {
  const cfg = MAP[source] ?? MAP.vercel
  const Icon = cfg.icon
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-foreground",
          cfg.bg,
        )}
      >
        <Icon className="h-2.5 w-2.5" strokeWidth={2.75} />
      </span>
      <span className="text-muted-foreground font-medium">{cfg.label}</span>
    </span>
  )
}
