"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"
import { fetcher, postJSON } from "@/lib/fetcher"
import type { AutopilotConfig as AutopilotCfg } from "@/lib/types"
import { ConfigPanel } from "./shared"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import { AlertTriangle } from "lucide-react"

export function AutopilotConfig() {
  const { data, mutate } = useSWR<AutopilotCfg>("/api/config/autopilot", fetcher)
  const [cfg, setCfg] = useState<AutopilotCfg | null>(null)
  useEffect(() => {
    if (data) setCfg(data)
  }, [data])

  if (!cfg) return <Skeleton className="h-64 w-full" />
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data)

  async function save() {
    if (!cfg) return
    await postJSON("/api/config/autopilot", cfg)
    await mutate()
  }

  return (
    <ConfigPanel
      title="Autopilot"
      description="When enabled for a severity, BlameBot will execute its recommended action (typically rollback) automatically if no human responds within the delay."
      onSave={save}
      hasChanges={dirty}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border-2 border-primary bg-primary/10 p-3">
          <AlertTriangle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-foreground/90">
            Autopilot acts on production. We recommend keeping it off for P1 unless you have rollback safety verified
            for every service.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border-2 border-foreground/25 bg-secondary/40 p-3">
          <Label htmlFor="autopilot-enabled" className="flex flex-col gap-1">
            <span className="font-medium">Master switch</span>
            <span className="text-xs text-muted-foreground">Disabled here, BlameBot only suggests.</span>
          </Label>
          <Switch
            id="autopilot-enabled"
            checked={cfg.enabled}
            onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(["P1", "P2", "P3"] as const).map((s) => (
            <div
              key={s}
              className="flex items-center justify-between rounded-xl border-2 border-foreground/25 bg-secondary/40 p-3"
            >
              <Label htmlFor={`auto-${s}`} className="font-mono text-sm">
                {s}
              </Label>
              <Switch
                id={`auto-${s}`}
                checked={cfg.perSeverity[s]}
                onCheckedChange={(v) =>
                  setCfg({ ...cfg, perSeverity: { ...cfg.perSeverity, [s]: v } })
                }
                disabled={!cfg.enabled}
              />
            </div>
          ))}
        </div>

        <Field>
          <FieldLabel>Delay before auto-action</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={60}
              value={cfg.delayMinutes}
              onChange={(e) => setCfg({ ...cfg, delayMinutes: Number(e.target.value) })}
              className="max-w-24 font-mono"
            />
            <span className="text-sm text-muted-foreground">minutes with no human response</span>
          </div>
        </Field>
      </div>
    </ConfigPanel>
  )
}
