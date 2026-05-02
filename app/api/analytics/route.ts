import { NextResponse } from "next/server"
import { kv } from "@/lib/kv"
import type { AnalyticsSnapshot, Incident, Severity, HeatmapCell, LeaderboardEntry, ServiceHealth } from "@/lib/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DAY = 24 * 60 * 60 * 1000

export async function GET() {
  const since = Date.now() - 30 * DAY
  const items = await kv.incidents.listSince(since, 2000)

  const totals = {
    active: items.filter((i) => i.status === "active").length,
    today: items.filter((i) => Date.now() - new Date(i.createdAt).getTime() < DAY).length,
    week: items.filter((i) => Date.now() - new Date(i.createdAt).getTime() < 7 * DAY).length,
    thirtyDays: items.length,
  }

  const mttr = computeMttr(items)
  const incidentsOverTime = bucketByDay(items, 30)
  const topFiles = topByFile(items, 10)
  const topServices = topByService(items, 8)
  const { heatmap, riskWindows } = buildHeatmap(items)
  const devScores = await kv.devscores.list()
  const leaderboard = buildLeaderboard(items, devScores)
  const serviceHealth = buildServiceHealth(items)

  const snapshot: AnalyticsSnapshot = {
    totals,
    mttr,
    incidentsOverTime,
    topFiles,
    topServices,
    devScores: devScores.slice(0, 10),
    heatmap,
    leaderboard,
    serviceHealth,
    riskWindows,
  }
  return NextResponse.json(snapshot)
}

function computeMttr(items: Incident[]): { thirtyDayMs: number | null; weekMs: number | null } {
  const resolved = items.filter((i) => i.resolvedAt)
  function avg(list: Incident[]): number | null {
    if (list.length === 0) return null
    const total = list.reduce((acc, i) => acc + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()), 0)
    return Math.round(total / list.length)
  }
  return {
    thirtyDayMs: avg(resolved),
    weekMs: avg(resolved.filter((i) => Date.now() - new Date(i.createdAt).getTime() < 7 * DAY)),
  }
}

function bucketByDay(items: Incident[], days: number) {
  const buckets: Record<string, { date: string; P1: number; P2: number; P3: number }> = {}
  for (let d = days - 1; d >= 0; d--) {
    const key = new Date(Date.now() - d * DAY).toISOString().slice(0, 10)
    buckets[key] = { date: key, P1: 0, P2: 0, P3: 0 }
  }
  for (const i of items) {
    const key = i.createdAt.slice(0, 10)
    if (buckets[key]) buckets[key][i.severity as Severity]++
  }
  return Object.values(buckets)
}

function topByFile(items: Incident[], limit: number) {
  const map = new Map<string, number>()
  for (const i of items) {
    for (const f of i.filesChanged ?? []) {
      map.set(f, (map.get(f) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([path, count]) => ({ path, count }))
}

function topByService(items: Incident[], limit: number) {
  const map = new Map<string, number>()
  for (const i of items) {
    if (!i.service) continue
    map.set(i.service, (map.get(i.service) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([service, count]) => ({ service, count }))
}

function buildHeatmap(items: Incident[]): {
  heatmap: HeatmapCell[]
  riskWindows: { label: string; dow: number; hourStart: number; hourEnd: number; avgIncidents: number }[]
} {
  const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
  for (const i of items) {
    const d = new Date(i.createdAt)
    counts[d.getDay()][d.getHours()]++
  }

  // Find max for risk level calculation
  const allCounts = counts.flat()
  const max = Math.max(1, ...allCounts)
  const avg = allCounts.reduce((a, b) => a + b, 0) / allCounts.length

  // Build heatmap with risk levels
  const heatmap: HeatmapCell[] = []
  for (let dow = 0; dow < 7; dow++) {
    for (let hour = 0; hour < 24; hour++) {
      const count = counts[dow][hour]
      let riskLevel: HeatmapCell["riskLevel"] = "safe"
      if (count > 0) {
        const ratio = count / max
        if (ratio >= 0.8) riskLevel = "critical"
        else if (ratio >= 0.6) riskLevel = "high"
        else if (ratio >= 0.4) riskLevel = "medium"
        else riskLevel = "low"
      }
      heatmap.push({ dow, hour, count, riskLevel })
    }
  }

  // Identify risk windows (consecutive high-risk hours)
  const riskWindows: { label: string; dow: number; hourStart: number; hourEnd: number; avgIncidents: number }[] = []
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  
  for (let dow = 0; dow < 7; dow++) {
    let windowStart: number | null = null
    let windowSum = 0
    let windowCount = 0
    
    for (let hour = 0; hour <= 24; hour++) {
      const count = hour < 24 ? counts[dow][hour] : 0
      const isRisky = count > avg * 1.5
      
      if (isRisky && windowStart === null) {
        windowStart = hour
        windowSum = count
        windowCount = 1
      } else if (isRisky && windowStart !== null) {
        windowSum += count
        windowCount++
      } else if (!isRisky && windowStart !== null && windowCount >= 2) {
        // End of a risk window (at least 2 hours)
        riskWindows.push({
          label: `${dayNames[dow]} ${windowStart}:00–${hour}:00`,
          dow,
          hourStart: windowStart,
          hourEnd: hour,
          avgIncidents: Math.round((windowSum / windowCount) * 10) / 10,
        })
        windowStart = null
        windowSum = 0
        windowCount = 0
      } else if (!isRisky) {
        windowStart = null
        windowSum = 0
        windowCount = 0
      }
    }
  }

  // Sort by avg incidents descending
  riskWindows.sort((a, b) => b.avgIncidents - a.avgIncidents)

  return { heatmap, riskWindows: riskWindows.slice(0, 5) }
}

function buildLeaderboard(items: Incident[], devScores: { slackUserId: string; name: string; resolved: number; caused: number; avgResponseMs: number | null }[]): LeaderboardEntry[] {
  // Calculate MTTR per dev from actual incidents
  const devMttr = new Map<string, number[]>()
  for (const i of items) {
    if (!i.resolvedAt || !i.resolvedBy) continue
    const mttr = new Date(i.resolvedAt).getTime() - new Date(i.createdAt).getTime()
    const existing = devMttr.get(i.resolvedBy.slackUserId) ?? []
    existing.push(mttr)
    devMttr.set(i.resolvedBy.slackUserId, existing)
  }

  // Calculate streaks (consecutive resolutions without causing)
  const devEvents = new Map<string, ("resolved" | "caused")[]>()
  const sortedItems = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  
  for (const i of sortedItems) {
    // Track caused incidents
    for (const dev of i.responsibleDevs) {
      const events = devEvents.get(dev.slackUserId) ?? []
      events.push("caused")
      devEvents.set(dev.slackUserId, events)
    }
    // Track resolved
    if (i.resolvedBy) {
      const events = devEvents.get(i.resolvedBy.slackUserId) ?? []
      events.push("resolved")
      devEvents.set(i.resolvedBy.slackUserId, events)
    }
  }

  const leaderboard: LeaderboardEntry[] = devScores
    .filter(d => d.resolved > 0)
    .map((d) => {
      const mttrList = devMttr.get(d.slackUserId) ?? []
      const avgMttrMs = mttrList.length > 0 ? Math.round(mttrList.reduce((a, b) => a + b, 0) / mttrList.length) : null
      
      // Calculate current streak
      const events = devEvents.get(d.slackUserId) ?? []
      let streak = 0
      for (let i = events.length - 1; i >= 0; i--) {
        if (events[i] === "resolved") streak++
        else break
      }

      // Trend: compare last 7 days vs previous 7 days
      const weekAgo = Date.now() - 7 * DAY
      const twoWeeksAgo = Date.now() - 14 * DAY
      const recentResolved = items.filter(
        (inc) => inc.resolvedBy?.slackUserId === d.slackUserId && new Date(inc.resolvedAt!).getTime() > weekAgo
      ).length
      const prevResolved = items.filter(
        (inc) =>
          inc.resolvedBy?.slackUserId === d.slackUserId &&
          new Date(inc.resolvedAt!).getTime() > twoWeeksAgo &&
          new Date(inc.resolvedAt!).getTime() <= weekAgo
      ).length
      const trend: "up" | "down" | "stable" = recentResolved > prevResolved ? "up" : recentResolved < prevResolved ? "down" : "stable"

      return {
        slackUserId: d.slackUserId,
        name: d.name,
        resolved: d.resolved,
        avgMttrMs,
        streak,
        rank: 0, // will be set after sorting
        trend,
      }
    })
    .sort((a, b) => {
      // Sort by: resolved desc, then avgMttr asc
      if (b.resolved !== a.resolved) return b.resolved - a.resolved
      if (a.avgMttrMs === null) return 1
      if (b.avgMttrMs === null) return -1
      return a.avgMttrMs - b.avgMttrMs
    })

  // Assign ranks
  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1
  })

  return leaderboard.slice(0, 10)
}

function buildServiceHealth(items: Incident[]): ServiceHealth[] {
  const serviceMap = new Map<string, Incident[]>()
  
  for (const i of items) {
    if (!i.service) continue
    const list = serviceMap.get(i.service) ?? []
    list.push(i)
    serviceMap.set(i.service, list)
  }

  const results: ServiceHealth[] = []

  for (const [service, incidents] of serviceMap) {
    const p1Count = incidents.filter((i) => i.severity === "P1").length
    const p2Count = incidents.filter((i) => i.severity === "P2").length
    const p3Count = incidents.filter((i) => i.severity === "P3").length
    
    const resolved = incidents.filter((i) => i.resolvedAt)
    const avgMttrMs = resolved.length > 0
      ? Math.round(resolved.reduce((acc, i) => acc + (new Date(i.resolvedAt!).getTime() - new Date(i.createdAt).getTime()), 0) / resolved.length)
      : null

    const lastIncidentAt = incidents.length > 0
      ? incidents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
      : null

    // Health score: penalize for incidents (especially P1), bonus for fast MTTR
    let healthScore = 100
    healthScore -= p1Count * 15
    healthScore -= p2Count * 8
    healthScore -= p3Count * 3
    if (avgMttrMs !== null) {
      // Bonus for fast resolution (under 30 mins = +10, under 1 hour = +5)
      if (avgMttrMs < 30 * 60 * 1000) healthScore += 10
      else if (avgMttrMs < 60 * 60 * 1000) healthScore += 5
      // Penalty for slow resolution (over 4 hours)
      if (avgMttrMs > 4 * 60 * 60 * 1000) healthScore -= 10
    }
    healthScore = Math.max(0, Math.min(100, healthScore))

    results.push({
      service,
      incidentCount: incidents.length,
      p1Count,
      p2Count,
      p3Count,
      avgMttrMs,
      lastIncidentAt,
      healthScore,
    })
  }

  return results.sort((a, b) => a.healthScore - b.healthScore).slice(0, 10)
}
