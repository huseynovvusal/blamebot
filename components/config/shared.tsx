"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function ConfigPanel({
  title,
  description,
  children,
  onSave,
  hasChanges,
  className,
}: {
  title: string
  description: string
  children: React.ReactNode
  onSave?: () => Promise<void>
  hasChanges?: boolean
  className?: string
}) {
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  async function save() {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave()
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }
  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-foreground bg-card shadow-[4px_4px_0_0_var(--foreground)] overflow-hidden",
        className,
      )}
    >
      {/* Header — compact: title (display font), description below it; Save lives on the right inline. */}
      <header className="flex flex-row items-center justify-between gap-4 border-b-2 border-foreground/25 px-5 py-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <h2 className="font-display text-base font-bold leading-tight tracking-tight">{title}</h2>
          <p className="text-xs leading-snug text-muted-foreground">{description}</p>
        </div>
        {onSave ? (
          <div className="flex items-center gap-3 shrink-0">
            {savedAt && Date.now() - savedAt < 4_000 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </span>
            ) : null}
            <Button size="sm" onClick={save} disabled={saving || !hasChanges}>
              {saving ? <Spinner className="mr-2" /> : null}
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </header>
      {/* Content padding intentionally tight — child rows handle their own internal spacing. */}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
