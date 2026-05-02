import { Octokit } from "@octokit/rest"

let _octo: Octokit | null = null

function octo(): Octokit | null {
  if (_octo) return _octo
  const token = process.env.GITHUB_TOKEN
  if (!token) return null
  _octo = new Octokit({ auth: token })
  return _octo
}

function repoCoords(): { owner: string; repo: string } | null {
  const owner = process.env.GITHUB_OWNER
  const repo = process.env.GITHUB_REPO
  if (!owner || !repo) return null
  return { owner, repo }
}

export type CommitInfo = {
  sha: string
  message: string
  authorName?: string
  authorEmail?: string
}

export type PRInfo = {
  number: number
  title: string
  url: string
  filesChanged: string[]
}

/**
 * Best-effort lookup. Returns null if GitHub is not configured or the lookup fails —
 * the pipeline degrades gracefully.
 */
export async function getCommit(sha: string): Promise<CommitInfo | null> {
  const o = octo()
  const r = repoCoords()
  if (!o || !r) return null
  try {
    const { data } = await o.repos.getCommit({ ...r, ref: sha })
    return {
      sha: data.sha,
      message: data.commit.message,
      authorName: data.commit.author?.name ?? undefined,
      authorEmail: data.commit.author?.email ?? undefined,
    }
  } catch {
    return null
  }
}

export async function getPRForCommit(sha: string): Promise<PRInfo | null> {
  const o = octo()
  const r = repoCoords()
  if (!o || !r) return null
  try {
    const { data: prs } = await o.repos.listPullRequestsAssociatedWithCommit({ ...r, commit_sha: sha })
    const pr = prs[0]
    if (!pr) return null
    const { data: files } = await o.pulls.listFiles({ ...r, pull_number: pr.number, per_page: 100 })
    return {
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      filesChanged: files.map((f) => f.filename),
    }
  } catch {
    return null
  }
}

export async function openDraftHotfixPR(opts: {
  baseBranch: string
  branchName: string
  title: string
  body: string
  filePatches: { path: string; content: string }[]
}): Promise<{ url: string; number: number } | null> {
  const o = octo()
  const r = repoCoords()
  if (!o || !r) return null
  try {
    const { data: base } = await o.repos.getBranch({ ...r, branch: opts.baseBranch })
    const sha = base.commit.sha
    await o.git.createRef({ ...r, ref: `refs/heads/${opts.branchName}`, sha })
    for (const p of opts.filePatches) {
      // get current file (if exists) for sha
      let existingSha: string | undefined
      try {
        const { data } = await o.repos.getContent({ ...r, path: p.path, ref: opts.branchName })
        if (!Array.isArray(data) && "sha" in data) existingSha = data.sha
      } catch {
        existingSha = undefined
      }
      await o.repos.createOrUpdateFileContents({
        ...r,
        path: p.path,
        message: `hotfix: ${p.path}`,
        content: Buffer.from(p.content, "utf8").toString("base64"),
        branch: opts.branchName,
        sha: existingSha,
      })
    }
    const { data: pr } = await o.pulls.create({
      ...r,
      title: opts.title,
      head: opts.branchName,
      base: opts.baseBranch,
      body: opts.body,
      draft: true,
    })
    return { url: pr.html_url, number: pr.number }
  } catch (e) {
    console.error("[v0] openDraftHotfixPR failed:", e)
    return null
  }
}
