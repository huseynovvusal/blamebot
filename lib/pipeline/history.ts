import { kv } from "../kv"
import type { Incident } from "../types"

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export async function findSimilarIncidents(inc: Incident): Promise<Incident[]> {
  // Strategy: union of recent incidents on the same files, then rank by error-message overlap.
  const candidates = new Map<string, Incident>()
  for (const f of inc.filesChanged ?? []) {
    const list = await kv.incidents.listByFile(f, 5)
    for (const c of list) {
      if (c.id === inc.id) continue
      if (Date.now() - new Date(c.createdAt).getTime() > THIRTY_DAYS) continue
      candidates.set(c.id, c)
    }
  }

  const ranked = [...candidates.values()]
    .map((c) => ({ inc: c, score: similarityScore(inc.errorMessage, c.errorMessage) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.inc)

  return ranked
}

function similarityScore(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let common = 0
  for (const t of ta) if (tb.has(t)) common++
  return common / Math.max(ta.size, tb.size)
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  )
}

const STOP = new Set(["the", "and", "for", "with", "from", "this", "that", "error", "failed", "during"])
