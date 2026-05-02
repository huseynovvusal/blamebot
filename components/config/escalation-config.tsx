"use client"

import useSWR from "swr"
import { useEffect, useState } from "react"
import { fetcher, postJSON } from "@/lib/fetcher"
import type { EscalationConfig as EscalationCfg, Severity } from "@/lib/types"
import { ConfigPanel } from "./shared"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Field, FieldLabel } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function EscalationConfig() {
  const { data, mutate } = useSWR<EscalationCfg>("/api/config/escalation", fetcher)
  const [cfg, setCfg] = useState<EscalationCfg | null>(null)
  useEffect(() => {
    if (data) setCfg(data)
  }, [data])

  if (!cfg) return <Skeleton className="h-64 w-full" />
  const dirty = JSON.stringify(cfg) !== JSON.stringify(data)

  async function save() {
    if (!cfg) return
    await postJSON("/api/config/escalation", cfg)
    await mutate()
  }

  return (
    <ConfigPanel
      title="Escalation"
      description="If the responsible owner doesn't acknowledge within the delay, BlameBot pages an escalation contact."
      onSave={save}
      hasChanges={dirty}
    >
      <div className="flex flex-col gap-5">
        <Field>
          <FieldLabel>Delay before escalating</FieldLabel>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={120}
              value={cfg.delayMinutes}
              onChange={(e) => setCfg({ ...cfg, delayMinutes: Number(e.target.value) })}
              className="max-w-24 font-mono"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </Field>

        <div className="flex flex-col gap-2">
          <Label>Escalation contacts</Label>
          {cfg.contacts.map((c, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border-2 border-foreground/25 bg-secondary/40 p-2">
              <Input
                placeholder="U_ENG_LEAD"
                value={c.slackUserId}
                onChange={(e) => {
                  const next = [...cfg.contacts]
                  next[i] = { ...c, slackUserId: e.target.value }
                  setCfg({ ...cfg, contacts: next })
                }}
                className="font-mono text-xs max-w-[180px]"
              />
              <Input
                placeholder="Alex (eng-lead)"
                value={c.name}
                onChange={(e) => {
                  const next = [...cfg.contacts]
                  next[i] = { ...c, name: e.target.value }
                  setCfg({ ...cfg, contacts: next })
                }}
              />
              <Select
                value={c.severity}
                onValueChange={(v) => {
                  const next = [...cfg.contacts]
                  next[i] = { ...c, severity: v as Severity }
                  setCfg({ ...cfg, contacts: next })
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
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove"
                onClick={() => setCfg({ ...cfg, contacts: cfg.contacts.filter((_, idx) => idx !== i) })}
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-fit gap-1.5"
            onClick={() =>
              setCfg({
                ...cfg,
                contacts: [...cfg.contacts, { slackUserId: "U_NEW", name: "New contact", severity: "P1" }],
              })
            }
          >
            <Plus className="h-3 w-3" /> Add contact
          </Button>
        </div>
      </div>
    </ConfigPanel>
  )
}
