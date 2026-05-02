"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"
import { fetcher, postJSON } from "@/lib/fetcher"
import type { BlackoutConfig as BlackoutCfg } from "@/lib/types"
import { ConfigPanel } from "./shared"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"

export function BlackoutConfig() {
  const { data, mutate } = useSWR<BlackoutCfg>("/api/config/blackout", fetcher)
  const [cfg, setCfg] = useState<BlackoutCfg | null>(null)
  useEffect(() => {
    if (data) setCfg(data)
  }, [data])

  if (!cfg) return <Skeleton className="h-64 w-full" />
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data)

  async function save() {
    if (!cfg) return
    await postJSON("/api/config/blackout", cfg)
    await mutate()
  }

  return (
    <ConfigPanel
      title="Blackout window"
      description="During the blackout window, BlameBot routes pages to the fallback contact instead of the on-call owner."
      onSave={save}
      hasChanges={dirty}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between rounded-xl border-2 border-foreground/25 bg-secondary/40 p-3">
          <Label htmlFor="blackout-enabled" className="flex flex-col gap-1">
            <span className="font-medium">Enable blackout window</span>
            <span className="text-xs text-muted-foreground">When off, owners are paged 24/7.</span>
          </Label>
          <Switch
            id="blackout-enabled"
            checked={cfg.enabled}
            onCheckedChange={(v) => setCfg({ ...cfg, enabled: v })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field>
            <FieldLabel>Timezone</FieldLabel>
            <Input value={cfg.tz} onChange={(e) => setCfg({ ...cfg, tz: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel>Start hour (0-23)</FieldLabel>
            <Input
              type="number"
              min={0}
              max={23}
              value={cfg.startHour}
              onChange={(e) => setCfg({ ...cfg, startHour: Number(e.target.value) })}
            />
          </Field>
          <Field>
            <FieldLabel>End hour (0-23)</FieldLabel>
            <Input
              type="number"
              min={0}
              max={23}
              value={cfg.endHour}
              onChange={(e) => setCfg({ ...cfg, endHour: Number(e.target.value) })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field>
            <FieldLabel>Fallback contact (Slack ID)</FieldLabel>
            <Input
              placeholder="U_FALLBACK"
              value={cfg.fallbackContact?.slackUserId ?? ""}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  fallbackContact: e.target.value
                    ? { slackUserId: e.target.value, name: cfg.fallbackContact?.name ?? "Fallback" }
                    : null,
                })
              }
              className="font-mono text-xs"
            />
          </Field>
          <Field>
            <FieldLabel>Fallback contact (display name)</FieldLabel>
            <Input
              placeholder="Maya Patel"
              value={cfg.fallbackContact?.name ?? ""}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  fallbackContact: cfg.fallbackContact
                    ? { ...cfg.fallbackContact, name: e.target.value }
                    : { slackUserId: "U_NEW", name: e.target.value },
                })
              }
            />
          </Field>
        </div>
      </div>
    </ConfigPanel>
  )
}
