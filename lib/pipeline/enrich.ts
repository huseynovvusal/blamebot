import { getCommit, getPRForCommit } from "../github"
import type { Incident, OwnerRule, Owner } from "../types"
import { matchesGlob, patternSpecificity } from "../utils"

export async function enrichWithGit(inc: Incident): Promise<Incident> {
  if (!inc.commit?.sha) return inc
  const [commit, pr] = await Promise.all([getCommit(inc.commit.sha), getPRForCommit(inc.commit.sha)])
  if (commit) {
    inc.commit = {
      sha: commit.sha,
      message: commit.message,
      authorName: commit.authorName ?? inc.commit.authorName,
    }
  }
  if (pr) {
    inc.pr = { number: pr.number, title: pr.title, url: pr.url }
    inc.filesChanged = pr.filesChanged
  }
  return inc
}

export function resolveOwners(filesChanged: string[] | undefined, rules: OwnerRule[]): Owner[] {
  const seen = new Set<string>()
  const owners: Owner[] = []

  // Sort rules by specificity (most specific first).
  const sorted = [...rules].sort((a, b) => patternSpecificity(b.pattern) - patternSpecificity(a.pattern))

  // Try matching changed files first.
  if (filesChanged && filesChanged.length > 0) {
    for (const file of filesChanged) {
      for (const rule of sorted) {
        if (matchesGlob(rule.pattern, file)) {
          for (const o of rule.owners) {
            if (!seen.has(o.slackUserId)) {
              seen.add(o.slackUserId)
              owners.push(o)
            }
          }
          break // Stop at first (most specific) match per file.
        }
      }
    }
  }

  if (owners.length > 0) return owners

  // Fallback: any pattern that matches "**" or unconditionally.
  for (const rule of sorted) {
    if (rule.pattern === "**" || rule.pattern === "*") {
      for (const o of rule.owners) {
        if (!seen.has(o.slackUserId)) {
          seen.add(o.slackUserId)
          owners.push(o)
        }
      }
      break
    }
  }
  return owners
}
