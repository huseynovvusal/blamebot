"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"
import { fetcher, postJSON } from "@/lib/fetcher"
import type { SeverityConfig as SeverityCfg, Severity } from "@/lib/types"
import { ConfigPanel } from "./shared"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function SeverityConfig() {
  const { data, mutate } = useSWR<SeverityCfg>("/api/config/severity", fetcher)
  const [cfg, setCfg] = useState<SeverityCfg | null>(null)
  useEffect(() => {
    if (data) setCfg(data)
  }, [data])

  if (!cfg) return <Skeleton className="h-64 w-full" />
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data)

  async function save() {
    if (!cfg) return
    await postJSON("/api/config/severity", cfg)
    await mutate()
  }

  return (
    <ConfigPanel
      title="Severity rules"
      description="Order matters. The first rule that matches a new incident wins. Otherwise, the default severity is used."
      onSave={save}
      hasChanges={dirty}
    >
      <div className="flex flex-col gap-5">
        <Field>
          <FieldLabel>Default severity</FieldLabel>
          <Select
            value={cfg.defaultSeverity}
            onValueChange={(v) => setCfg({ ...cfg, defaultSeverity: v as Severity })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P1">P1</SelectItem>
              <SelectItem value="P2">P2</SelectItem>
              <SelectItem value="P3">P3</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Rules (top to bottom)</Label>
          {cfg.rules.map((r, i) => (
            <div key={i} className="rounded-xl border-2 border-foreground/25 bg-secondary/40 p-3 flex flex-col gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Select
                  value={r.severity}
                  onValueChange={(v) => {
                    const next = [...cfg.rules]
                    next[i] = { ...r, severity: v as Severity }
                    setCfg({ ...cfg, rules: next })
                  }}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                    <SelectItem value="P3">P3</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="error includes (comma-separated)"
                  value={r.errorIncludes?.join(", ") ?? ""}
                  onChange={(e) => {
                    const next = [...cfg.rules]
                    next[i] = {
                      ...r,
                      errorIncludes: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }
                    setCfg({ ...cfg, rules: next })
                  }}
                  className="max-w-[260px] text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove"
                  onClick={() => setCfg({ ...cfg, rules: cfg.rules.filter((_, idx) => idx !== i) })}
                  className="ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!r.isSiteDown}
                    onCheckedChange={(v) => {
                      const next = [...cfg.rules]
                      next[i] = { ...r, isSiteDown: v }
                      setCfg({ ...cfg, rules: next })
                    }}
                    id={`sd-${i}`}
                  />
                  <Label htmlFor={`sd-${i}`} className="text-xs">
                    Site is down
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!r.isDeploymentFailure}
                    onCheckedChange={(v) => {
                      const next = [...cfg.rules]
                      next[i] = { ...r, isDeploymentFailure: v }
                      setCfg({ ...cfg, rules: next })
                    }}
                    id={`df-${i}`}
                  />
                  <Label htmlFor={`df-${i}`} className="text-xs">
                    Deployment failure
                  </Label>
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-fit gap-1.5"
            onClick={() => setCfg({ ...cfg, rules: [...cfg.rules, { severity: "P2", errorIncludes: [] }] })}
          >
            <Plus className="h-3 w-3" /> Add rule
          </Button>
        </div>
      </div>
    </ConfigPanel>
  )
}
