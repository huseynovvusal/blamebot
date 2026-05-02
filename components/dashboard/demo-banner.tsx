"use client"

import { useState } from "react"
import { Check, ChevronDown, Copy, FlaskConical } from "lucide-react"
import { cn } from "@/lib/utils"

const CURL = `curl -X POST \${APP_URL:-http://localhost:3000}/api/webhooks/vercel \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "deployment.error",
    "id": "evt_demo_001",
    "payload": {
      "deploymentId": "dpl_abc123xyz",
      "name": "my-app",
      "url": "my-app.vercel.app",
      "target": "production",
      "meta": {
        "githubCommitSha": "a1b2c3d4e5f6",
        "githubCommitMessage": "feat: add payments flow"
      },
      "errorMessage": "Build failed: TypeError: Cannot read properties of undefined",
      "errorCode": "BUILD_FAILED"
    }
  }'`

export function DemoBanner() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(CURL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border-2 border-foreground bg-accent/30 shadow-[4px_4px_0_0_var(--foreground)] p-4 flex flex-col gap-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-start gap-2.5 text-left w-full"
      >
        <FlaskConical className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={2.75} />
        <div className="flex-1 flex flex-col gap-1">
          <p className="text-sm font-semibold">Demo Mode</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Live data requires connecting your Vercel, Sentry, and Slack accounts via webhooks, which
            isn&apos;t practical for a public demo. The incidents below are seeded to show what BlameBot
            looks like in a real on-call environment. Want to see the actual agent fire? Run this against
            the live endpoint:
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 mt-0.5 transition-transform duration-200", open && "rotate-180")}
          strokeWidth={2.75}
        />
      </button>

      {open && (
        <>
          <div className="relative">
            <pre className="rounded-lg border border-foreground/20 bg-card px-4 py-3 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre pr-12">
              {CURL}
            </pre>
            <button
              onClick={copy}
              className={cn(
                "absolute right-2 top-2 rounded-md border border-foreground/20 bg-card p-1.5 transition-colors hover:bg-accent",
                copied && "text-green-600",
              )}
              aria-label="Copy curl command"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground pl-6">
            Watch the incident appear in real-time above.
          </p>
        </>
      )}
    </div>
  )
}
