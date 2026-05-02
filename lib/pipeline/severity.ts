import type { Incident, Severity, SeverityConfig } from "../types"

export function decideSeverity(
  inc: Incident,
  cfg: SeverityConfig,
  flags: { isDeploymentFailure?: boolean; isSiteDown?: boolean },
): Severity {
  for (const r of cfg.rules) {
    if (r.isSiteDown && flags.isSiteDown) return r.severity
    if (r.isDeploymentFailure && flags.isDeploymentFailure) return r.severity
    if (r.sourceIs?.includes(inc.source)) return r.severity
    if (r.errorIncludes?.some((s) => inc.errorMessage.toLowerCase().includes(s.toLowerCase()))) return r.severity
  }
  return cfg.defaultSeverity
}
