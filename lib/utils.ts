import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Severity, IncidentStatus } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function relativeTime(iso: string | Date | number): string {
  const t = typeof iso === "string" ? new Date(iso).getTime() : iso instanceof Date ? iso.getTime() : iso
  const diff = Date.now() - t
  if (diff < 0) return "in the future"
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export function formatDuration(ms: number): string {
  if (ms < 0) return "0s"
  const sec = Math.floor(ms / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  const remSec = sec % 60
  if (min < 60) return remSec ? `${min}m ${remSec}s` : `${min}m`
  const hr = Math.floor(min / 60)
  const remMin = min % 60
  if (hr < 24) return remMin ? `${hr}h ${remMin}m` : `${hr}h`
  const day = Math.floor(hr / 24)
  const remHr = hr % 24
  return remHr ? `${day}d ${remHr}h` : `${day}d`
}

export function severityColor(s: Severity): string {
  if (s === "P1") return "bg-primary/15 text-primary border-primary/40"
  if (s === "P2") return "bg-accent/15 text-accent border-accent/40"
  return "bg-muted text-muted-foreground border-border"
}

export function severityDotColor(s: Severity): string {
  if (s === "P1") return "bg-primary"
  if (s === "P2") return "bg-accent"
  return "bg-muted-foreground"
}

export function statusColor(s: IncidentStatus): string {
  if (s === "active") return "bg-primary/15 text-primary border-primary/40"
  if (s === "acknowledged") return "bg-accent/15 text-accent border-accent/40"
  return "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
}

// Glob-ish pattern match: supports ** and *
export function matchesGlob(pattern: string, path: string): boolean {
  if (pattern === "**" || pattern === "*") return true
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "::DOUBLESTAR::")
        .replace(/\*/g, "[^/]*")
        .replace(/::DOUBLESTAR::/g, ".*") +
      "$",
  )
  return regex.test(path)
}

// Score patterns: longest non-wildcard prefix wins.
export function patternSpecificity(pattern: string): number {
  const beforeWildcard = pattern.split(/[*]/)[0]
  return beforeWildcard.length * 10 - (pattern.match(/\*/g)?.length ?? 0)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}
