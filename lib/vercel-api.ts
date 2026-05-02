// Thin wrapper around the Vercel REST API for rollback.
// Falls back to a no-op simulation if env vars are missing — useful for demos.

const BASE = "https://api.vercel.com"

function authHeaders(): Record<string, string> | null {
  const token = process.env.VERCEL_API_TOKEN
  if (!token) return null
  return { Authorization: `Bearer ${token}` }
}

function teamQuery(): string {
  const team = process.env.VERCEL_TEAM_ID
  return team ? `?teamId=${encodeURIComponent(team)}` : ""
}

export type RollbackResult = {
  ok: boolean
  simulated: boolean
  rolledBackTo?: { id: string; url: string }
  error?: string
}

/** Roll back the project to the most recent READY production deployment that isn't `currentDeploymentId`. */
export async function rollbackProject(currentDeploymentId?: string): Promise<RollbackResult> {
  const headers = authHeaders()
  const projectId = process.env.VERCEL_PROJECT_ID
  if (!headers || !projectId) {
    // Demo path — simulate.
    return {
      ok: true,
      simulated: true,
      rolledBackTo: { id: "dpl_simulated_prev", url: "https://example.vercel.app" },
    }
  }
  try {
    const listRes = await fetch(
      `${BASE}/v6/deployments${teamQuery()}${teamQuery() ? "&" : "?"}projectId=${encodeURIComponent(
        projectId,
      )}&target=production&state=READY&limit=10`,
      { headers, cache: "no-store" },
    )
    if (!listRes.ok) {
      return { ok: false, simulated: false, error: `list failed ${listRes.status}` }
    }
    const list = (await listRes.json()) as { deployments: { uid: string; url: string }[] }
    const candidate = list.deployments.find((d) => d.uid !== currentDeploymentId)
    if (!candidate) return { ok: false, simulated: false, error: "no previous deployment found" }

    const rollbackRes = await fetch(`${BASE}/v13/deployments/${candidate.uid}/rollback${teamQuery()}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
    })
    if (!rollbackRes.ok && rollbackRes.status !== 201 && rollbackRes.status !== 200) {
      return { ok: false, simulated: false, error: `rollback failed ${rollbackRes.status}` }
    }
    return {
      ok: true,
      simulated: false,
      rolledBackTo: { id: candidate.uid, url: `https://${candidate.url}` },
    }
  } catch (e) {
    return { ok: false, simulated: false, error: e instanceof Error ? e.message : String(e) }
  }
}
