"use client"

import useSWR from "swr"
import { fetcher, postJSON } from "@/lib/fetcher"
import type { OwnerRule } from "@/lib/types"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, UserPlus } from "lucide-react"
import { ConfigPanel } from "./shared"
import { Skeleton } from "@/components/ui/skeleton"

export function OwnersConfig() {
  const { data, mutate } = useSWR<OwnerRule[]>("/api/config/owners", fetcher)
  const [rules, setRules] = useState<OwnerRule[] | null>(null)
  useEffect(() => {
    if (data) setRules(data)
  }, [data])

  if (!rules) return <Skeleton className="h-64 w-full" />

  const dirty = JSON.stringify(rules) !== JSON.stringify(data)

  async function save() {
    if (!rules) return
    await postJSON("/api/config/owners", rules)
    await mutate()
  }

  return (
    <ConfigPanel
      title="Owner rules"
      description="Map file path globs to one or more responsible Slack users. The most-specific match wins; **/** is the catch-all."
      onSave={save}
      hasChanges={dirty}
    >
      <div className="flex flex-col gap-3">
        {rules.map((r, i) => (
          <div key={i} className="rounded-xl border-2 border-foreground/25 bg-secondary/40 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Input
                value={r.pattern}
                onChange={(e) => {
                  const next = [...rules]
                  next[i] = { ...r, pattern: e.target.value }
                  setRules(next)
                }}
                className="font-mono text-xs"
                placeholder="app/api/billing/**"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRules(rules.filter((_, idx) => idx !== i))}
                aria-label="Delete rule"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              {r.owners.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <Input
                    value={o.slackUserId}
                    onChange={(e) => {
                      const next = [...rules]
                      const owners = [...next[i].owners]
                      owners[oi] = { ...o, slackUserId: e.target.value }
                      next[i] = { ...next[i], owners }
                      setRules(next)
                    }}
                    placeholder="U_SLACK_ID"
                    className="font-mono text-xs max-w-[180px]"
                  />
                  <Input
                    value={o.name}
                    onChange={(e) => {
                      const next = [...rules]
                      const owners = [...next[i].owners]
                      owners[oi] = { ...o, name: e.target.value }
                      next[i] = { ...next[i], owners }
                      setRules(next)
                    }}
                    placeholder="Sarah Chen"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove owner"
                    onClick={() => {
                      const next = [...rules]
                      next[i] = { ...next[i], owners: next[i].owners.filter((_, idx) => idx !== oi) }
                      setRules(next)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-fit gap-1.5"
                onClick={() => {
                  const next = [...rules]
                  next[i] = { ...next[i], owners: [...next[i].owners, { slackUserId: "U_NEW", name: "New owner" }] }
                  setRules(next)
                }}
              >
                <UserPlus className="h-3 w-3" /> Add owner
              </Button>
            </div>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          onClick={() =>
            setRules([
              ...rules,
              { pattern: "app/api/new-area/**", owners: [{ slackUserId: "U_NEW", name: "New owner" }] },
            ])
          }
        >
          <Plus className="h-3 w-3" /> Add rule
        </Button>
      </div>
    </ConfigPanel>
  )
}
