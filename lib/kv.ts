import { Redis } from "@upstash/redis"
import type {
  AutopilotConfig,
  BlackoutConfig,
  DevScore,
  EscalationConfig,
  Incident,
  IntegrationStatus,
  Owner,
  OwnerRule,
  Postmortem,
  Severity,
  SeverityConfig,
} from "./types"

let _redis: Redis | null = null

function client(): Redis {
  if (_redis) return _redis
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    throw new Error("Upstash for Redis is not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN.")
  }
  _redis = new Redis({ url, token })
  return _redis
}

// ---------- Keys ----------
const K = {
  incident: (id: string) => `incidents:${id}`,
  incidentsIndex: "incidents:index",
  bySeverity: (s: Severity) => `incidents:bySeverity:${s}`,
  byFile: (path: string) => `incidents:byFile:${path}`,
  byDev: (slackUserId: string) => `incidents:byDev:${slackUserId}`,
  byService: (service: string) => `incidents:byService:${service}`,
  ownersConfig: "config:owners",
  escalationConfig: "config:escalation",
  severityConfig: "config:severity",
  blackoutConfig: "config:blackout",
  autopilotConfig: "config:autopilot",
  integrations: "config:integrations",
  devscore: (id: string) => `devscores:${id}`,
  devscoresIndex: "devscores:index",
  postmortem: (id: string) => `postmortems:${id}`,
  escalationsPending: "escalations:pending",
}

// ---------- Incidents ----------
export const incidents = {
  async get(id: string): Promise<Incident | null> {
    const r = client()
    const v = await r.get<Incident>(K.incident(id))
    return v ?? null
  },

  async put(inc: Incident): Promise<void> {
    const r = client()
    const score = new Date(inc.createdAt).getTime()
    const pipe = r.pipeline()
    pipe.set(K.incident(inc.id), inc)
    pipe.zadd(K.incidentsIndex, { score, member: inc.id })
    pipe.zadd(K.bySeverity(inc.severity), { score, member: inc.id })
    if (inc.service) pipe.zadd(K.byService(inc.service), { score, member: inc.id })
    for (const f of inc.filesChanged ?? []) pipe.zadd(K.byFile(f), { score, member: inc.id })
    for (const dev of inc.responsibleDevs ?? []) pipe.zadd(K.byDev(dev.slackUserId), { score, member: inc.id })
    await pipe.exec()
  },

  /** Atomic-ish update: re-puts the incident. Caller is responsible for not regressing indices. */
  async update(inc: Incident): Promise<void> {
    await client().set(K.incident(inc.id), inc)
  },

  async list(opts: {
    limit?: number
    cursor?: number // unix ms; return strictly older than this
    severity?: Severity
    service?: string
    status?: "active" | "acknowledged" | "resolved"
    sinceMs?: number
  }): Promise<{ items: Incident[]; nextCursor: number | null }> {
    const r = client()
    const limit = opts.limit ?? 25
    // Upstash REST serializes Infinity to null which it rejects. Use the literal
    // "+inf" / "-inf" tokens that ZRANGE BYSCORE accepts.
    const max: number | string = opts.cursor ? opts.cursor - 1 : "+inf"
    const min: number | string = opts.sinceMs ?? "-inf"
    const key = opts.severity ? K.bySeverity(opts.severity) : opts.service ? K.byService(opts.service) : K.incidentsIndex

    // zrange by score, descending, with limit. With BYSCORE+REV we pass max,min.
    const ids = (await r.zrange(key, max as number, min as number, {
      byScore: true,
      rev: true,
      offset: 0,
      count: limit * 3, // overfetch for status filtering
    })) as string[]

    if (ids.length === 0) return { items: [], nextCursor: null }
    const pipe = r.pipeline()
    for (const id of ids) pipe.get(K.incident(id))
    const raw = (await pipe.exec()) as (Incident | null)[]
    let items = raw.filter((x): x is Incident => !!x)
    if (opts.status) items = items.filter((i) => i.status === opts.status)
    items = items.slice(0, limit)
    const nextCursor = items.length === limit ? new Date(items[items.length - 1].createdAt).getTime() : null
    return { items, nextCursor }
  },

  async listByFile(path: string, limit = 5): Promise<Incident[]> {
    const r = client()
    const ids = (await r.zrange(K.byFile(path), "+inf" as unknown as number, "-inf" as unknown as number, {
      byScore: true,
      rev: true,
      offset: 0,
      count: limit,
    })) as string[]
    if (ids.length === 0) return []
    const pipe = r.pipeline()
    for (const id of ids) pipe.get(K.incident(id))
    const raw = (await pipe.exec()) as (Incident | null)[]
    return raw.filter((x): x is Incident => !!x)
  },

  async countActive(): Promise<number> {
    const r = client()
    // Active = recent + status active. Cheap-ish: scan recent 100.
    const ids = (await r.zrange(K.incidentsIndex, "+inf" as unknown as number, "-inf" as unknown as number, {
      byScore: true,
      rev: true,
      offset: 0,
      count: 100,
    })) as string[]
    if (ids.length === 0) return 0
    const pipe = r.pipeline()
    for (const id of ids) pipe.get(K.incident(id))
    const raw = (await pipe.exec()) as (Incident | null)[]
    return raw.filter((x) => x?.status === "active").length
  },

  async listSince(sinceMs: number, max = 1000): Promise<Incident[]> {
    const r = client()
    const ids = (await r.zrange(K.incidentsIndex, "+inf" as unknown as number, sinceMs, {
      byScore: true,
      rev: true,
      offset: 0,
      count: max,
    })) as string[]
    if (ids.length === 0) return []
    const pipe = r.pipeline()
    for (const id of ids) pipe.get(K.incident(id))
    const raw = (await pipe.exec()) as (Incident | null)[]
    return raw.filter((x): x is Incident => !!x)
  },
}

// ---------- Config ----------
const DEFAULTS = {
  owners: [{ pattern: "**", owners: [{ slackUserId: "U_ONCALL", name: "@oncall" }] }] as OwnerRule[],
  escalation: {
    delayMinutes: 5,
    contacts: [
      { slackUserId: "U_ENG_LEAD", name: "@eng-lead", severity: "P1" as Severity },
      { slackUserId: "U_ENG_LEAD", name: "@eng-lead", severity: "P2" as Severity },
    ],
  } as EscalationConfig,
  severity: {
    defaultSeverity: "P3" as Severity,
    rules: [
      { severity: "P1" as Severity, isSiteDown: true },
      { severity: "P1" as Severity, isDeploymentFailure: true },
      { severity: "P1" as Severity, errorIncludes: ["payment", "billing", "checkout"] },
      { severity: "P2" as Severity, errorIncludes: ["TypeError", "500", "ECONNREFUSED"] },
    ],
  } as SeverityConfig,
  blackout: {
    enabled: false,
    tz: "America/New_York",
    startHour: 22,
    endHour: 7,
    fallbackContact: null,
  } as BlackoutConfig,
  autopilot: {
    enabled: false,
    perSeverity: { P1: false, P2: false, P3: false },
    delayMinutes: 10,
  } as AutopilotConfig,
}

export const config = {
  owners: {
    async get(): Promise<OwnerRule[]> {
      const v = await client().get<OwnerRule[]>(K.ownersConfig)
      return v ?? DEFAULTS.owners
    },
    async put(v: OwnerRule[]): Promise<void> {
      await client().set(K.ownersConfig, v)
    },
  },
  escalation: {
    async get(): Promise<EscalationConfig> {
      return (await client().get<EscalationConfig>(K.escalationConfig)) ?? DEFAULTS.escalation
    },
    async put(v: EscalationConfig): Promise<void> {
      await client().set(K.escalationConfig, v)
    },
  },
  severity: {
    async get(): Promise<SeverityConfig> {
      return (await client().get<SeverityConfig>(K.severityConfig)) ?? DEFAULTS.severity
    },
    async put(v: SeverityConfig): Promise<void> {
      await client().set(K.severityConfig, v)
    },
  },
  blackout: {
    async get(): Promise<BlackoutConfig> {
      return (await client().get<BlackoutConfig>(K.blackoutConfig)) ?? DEFAULTS.blackout
    },
    async put(v: BlackoutConfig): Promise<void> {
      await client().set(K.blackoutConfig, v)
    },
  },
  autopilot: {
    async get(): Promise<AutopilotConfig> {
      return (await client().get<AutopilotConfig>(K.autopilotConfig)) ?? DEFAULTS.autopilot
    },
    async put(v: AutopilotConfig): Promise<void> {
      await client().set(K.autopilotConfig, v)
    },
  },
  integrations: {
    async get(): Promise<IntegrationStatus> {
      const r = client()
      const h = (await r.hgetall<Record<string, string>>(K.integrations)) ?? {}
      return {
        vercel: { lastReceivedAt: h.vercel ?? null },
        sentry: { lastReceivedAt: h.sentry ?? null },
        uptime: { lastReceivedAt: h.uptime ?? null },
      }
    },
    async stamp(source: "vercel" | "sentry" | "uptime"): Promise<void> {
      await client().hset(K.integrations, { [source]: new Date().toISOString() })
    },
  },
}

// ---------- Devscores ----------
export const devscores = {
  async get(slackUserId: string): Promise<DevScore | null> {
    return (await client().get<DevScore>(K.devscore(slackUserId))) ?? null
  },
  async upsert(owner: Owner, patch: Partial<DevScore>): Promise<void> {
    const r = client()
    const existing = (await r.get<DevScore>(K.devscore(owner.slackUserId))) ?? {
      slackUserId: owner.slackUserId,
      name: owner.name,
      caused: 0,
      resolved: 0,
      postmortemsWritten: 0,
      avgResponseMs: null,
      reliabilityScore: 100,
      lastIncidentAt: null,
    }
    const next: DevScore = { ...existing, ...patch, name: owner.name }
    await r.set(K.devscore(owner.slackUserId), next)
    await r.zadd(K.devscoresIndex, { score: next.caused, member: owner.slackUserId })
  },
  async list(): Promise<DevScore[]> {
    const r = client()
    const ids = (await r.zrange(K.devscoresIndex, 0, -1, { rev: true })) as string[]
    if (ids.length === 0) return []
    const pipe = r.pipeline()
    for (const id of ids) pipe.get(K.devscore(id))
    const raw = (await pipe.exec()) as (DevScore | null)[]
    return raw
      .filter((x): x is DevScore => !!x)
      .map((d) => ({
        ...d,
        reliabilityScore: computeReliability(d),
      }))
  },
}

function computeReliability(d: DevScore): number {
  // Simple scoring: more resolved + postmortems = higher; more caused = lower.
  const base = 100
  const penalty = Math.min(60, d.caused * 5)
  const bonus = Math.min(20, d.resolved * 2 + d.postmortemsWritten * 3)
  return Math.max(0, Math.min(100, base - penalty + bonus))
}

// ---------- Postmortems ----------
export const postmortems = {
  async get(incidentId: string): Promise<Postmortem | null> {
    return (await client().get<Postmortem>(K.postmortem(incidentId))) ?? null
  },
  async put(p: Postmortem): Promise<void> {
    await client().set(K.postmortem(p.incidentId), p)
  },
}

// ---------- Escalations ----------
export const escalations = {
  async schedule(incidentId: string, fireAtMs: number): Promise<void> {
    await client().zadd(K.escalationsPending, { score: fireAtMs, member: incidentId })
  },
  async cancel(incidentId: string): Promise<void> {
    await client().zrem(K.escalationsPending, incidentId)
  },
  async drainDue(now = Date.now()): Promise<string[]> {
    const r = client()
    const ids = (await r.zrange(K.escalationsPending, 0, now, {
      byScore: true,
      offset: 0,
      count: 50,
    })) as string[]
    if (ids.length === 0) return []
    await r.zrem(K.escalationsPending, ...ids)
    return ids
  },
}

// ---------- Credentials ----------
const CREDS_PREFIX = "credentials:"

export const credentials = {
  async get<T = unknown>(key: string): Promise<T | null> {
    return (await client().get<T>(`${CREDS_PREFIX}${key}`)) ?? null
  },
  async set<T = unknown>(key: string, value: T): Promise<void> {
    await client().set(`${CREDS_PREFIX}${key}`, value)
  },
  async delete(key: string): Promise<void> {
    await client().del(`${CREDS_PREFIX}${key}`)
  },
  async exists(key: string): Promise<boolean> {
    return (await client().exists(`${CREDS_PREFIX}${key}`)) === 1
  },
}

// ---------- Health ----------
export async function kvHealthcheck(): Promise<{ ok: boolean; error?: string }> {
  try {
    await client().ping()
    return { ok: true }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const kv = { incidents, config, devscores, postmortems, escalations, credentials }
