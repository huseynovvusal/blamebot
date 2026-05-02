"use client"

import { useState } from "react"
import { postJSON } from "@/lib/fetcher"
import { ConfigPanel } from "./shared"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { Sparkles, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { mutate as globalMutate } from "swr"

const EXAMPLES = [
  "Make Sarah responsible for app/api/billing/** code",
  "Page eng-lead 5 minutes after a P1 if no one acks",
  "Treat anything containing 'checkout' as P1",
  "Don't page anyone between 10pm and 7am, fall back to Maya",
  "Enable autopilot rollback for P1 after 10 minutes",
]

type Result = {
  applied: boolean
  intent: string
  summary: string
}

export function NLConfigPanel() {
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!text.trim()) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const r = await postJSON<Result>("/api/config/nl", { text })
      setResult(r)
      // Refresh all config caches
      await globalMutate((key) => typeof key === "string" && key.startsWith("/api/config/"), undefined, {
        revalidate: true,
      })
      setText("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfigPanel
      title="Natural-language config"
      description="Describe a config change in plain English. BlameBot translates it to a structured patch and applies it."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Make Sarah responsible for app/api/billing/** code"
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center gap-2">
            <Button onClick={submit} disabled={busy || !text.trim()} className="gap-1.5">
              {busy ? <Spinner /> : <Sparkles className="h-3.5 w-3.5" />}
              {busy ? "Applying…" : "Apply"}
            </Button>
            <span className="text-xs text-muted-foreground">Powered by AI Gateway · changes are immediate</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Try one</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setText(ex)}
                className="text-xs rounded-full border-2 border-foreground/25 bg-card hover:bg-secondary hover:shadow-[2px_2px_0_0_var(--foreground)] px-3 py-1.5 font-medium transition-[box-shadow,background-color]"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {result ? (
          <div
            className={cn(
              "rounded-xl border-2 p-3",
              result.applied ? "border-success bg-success/10" : "border-foreground/25 bg-secondary/40",
            )}
          >
            <div className="flex items-center gap-2">
              {result.applied ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium">
                {result.applied ? "Applied" : "Could not apply"}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono ml-auto">
                {result.intent}
              </span>
            </div>
            <p className="mt-1 text-sm text-foreground/90">{result.summary}</p>
          </div>
        ) : null}
        {error ? <p className="text-sm text-primary">{error}</p> : null}
      </div>
    </ConfigPanel>
  )
}
