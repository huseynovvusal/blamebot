"use client"

import useSWR, { mutate } from "swr"
import Link from "next/link"
import { fetcher, postJSON } from "@/lib/fetcher"
import type { Incident, Postmortem } from "@/lib/types"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { SeverityPill } from "@/components/severity-pill"
import { StatusPill } from "@/components/status-pill"
import { SourceIcon } from "@/components/source-icon"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  ArrowLeft,
  CheckCircle2,
  CornerDownRight,
  ExternalLink,
  Hash,
  ScrollText,
  Sparkles,
  RotateCcw,
  Wrench,
  AlertTriangle,
} from "lucide-react"
import { relativeTime, formatDuration, cn } from "@/lib/utils"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"

type DetailResponse = {
  incident: Incident
  postmortem: Postmortem | null
  similar: Incident[]
}

export function IncidentDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useSWR<DetailResponse>(`/api/incidents/${id}`, fetcher, {
    refreshInterval: 5_000,
  })

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px] flex flex-col gap-4">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-96 col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6 lg:p-8 max-w-[1600px]">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Incident not found</EmptyTitle>
            <EmptyDescription>It may have been removed or never existed.</EmptyDescription>
          </EmptyHeader>
        </Empty>
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/incidents">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to incidents
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const inc = data.incident

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1600px]">
      <DetailHeader inc={inc} />
      <ActionBar inc={inc} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <AIReportCard inc={inc} />
          <SlackThreadMirror inc={inc} />
        </div>
        <div className="flex flex-col gap-6">
          <MetaCard inc={inc} />
          <SimilarIncidentsCard similar={data.similar} />
          <TimelineCard inc={inc} />
        </div>
      </div>
      <PostmortemCard inc={inc} postmortem={data.postmortem} />
    </div>
  )
}

function DetailHeader({ inc }: { inc: Incident }) {
  return (
    <header className="flex flex-col gap-4">
      <Link
        href="/incidents"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All incidents
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityPill severity={inc.severity} />
            <StatusPill status={inc.status} />
            <SourceIcon source={inc.source} />
            <span className="font-mono text-xs text-muted-foreground">
              <Hash className="inline h-3 w-3" />
              {inc.id.slice(0, 12)}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-balance">{inc.title}</h1>
          <p className="font-mono text-sm text-muted-foreground break-words">{inc.errorMessage}</p>
        </div>
      </div>
    </header>
  )
}

function ActionBar({ inc }: { inc: Incident }) {
  const [busy, setBusy] = useState<string | null>(null)

  async function act(action: "ack" | "resolve") {
    setBusy(action)
    try {
      await postJSON(`/api/incidents/${inc.id}`, { action })
      await mutate(`/api/incidents/${inc.id}`)
      await mutate((k) => typeof k === "string" && k.startsWith("/api/incidents"), undefined, { revalidate: true })
      await mutate("/api/analytics")
    } catch (e) {
      console.error("[v0] action failed", e)
    } finally {
      setBusy(null)
    }
  }

  async function genPostmortem() {
    setBusy("postmortem")
    try {
      await postJSON(`/api/incidents/${inc.id}/postmortem`, {})
      await mutate(`/api/incidents/${inc.id}`)
    } catch (e) {
      console.error("[v0] postmortem failed", e)
    } finally {
      setBusy(null)
    }
  }

  const isActive = inc.status === "active"
  const isAck = inc.status === "acknowledged"
  const isResolved = inc.status === "resolved"

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex flex-wrap items-center gap-2">
        {isActive ? (
          <Button onClick={() => act("ack")} disabled={!!busy} size="sm" variant="default" className="gap-1.5">
            {busy === "ack" ? <Spinner /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Acknowledge
          </Button>
        ) : null}
        {(isActive || isAck) && (
          <Button onClick={() => act("resolve")} disabled={!!busy} size="sm" variant="outline" className="gap-1.5">
            {busy === "resolve" ? <Spinner /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            Mark resolved
          </Button>
        )}
        {isResolved ? (
          <Button onClick={genPostmortem} disabled={!!busy} size="sm" variant="outline" className="gap-1.5">
            {busy === "postmortem" ? <Spinner /> : <ScrollText className="h-3.5 w-3.5" />}
            Generate postmortem
          </Button>
        ) : null}
        {inc.aiReport?.recommendedActionType === "rollback" && (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-primary">
            <AlertTriangle className="h-3.5 w-3.5" />
            AI recommends rollback
          </span>
        )}
      </div>
    </Card>
  )
}

function AIReportCard({ inc }: { inc: Incident }) {
  const ai = inc.aiReport
  const ACTION_ICON = {
    rollback: RotateCcw,
    hotfix: Wrench,
    investigate: Sparkles,
    monitor: Sparkles,
  } as const

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h2 className="font-medium">BlameBot analysis</h2>
        </div>
        {ai?.confidence ? (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
            confidence: {ai.confidence}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="pb-5">
        {!ai ? (
          <p className="text-sm text-muted-foreground">Generating…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <Section label="Root cause" body={ai.rootCause} />
            <Section label="Blast radius" body={ai.blastRadius} />
            <Section label="Historical context" body={ai.historicalContext} />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Recommended action</span>
              <div className="flex items-start gap-2 mt-1">
                {(() => {
                  const Icon = ACTION_ICON[ai.recommendedActionType] ?? Sparkles
                  return (
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border",
                        ai.recommendedActionType === "rollback"
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-accent/40 bg-accent/15 text-accent",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  )
                })()}
                <p className="text-sm leading-relaxed">{ai.recommendedAction}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <p className="text-sm leading-relaxed text-pretty">{body}</p>
    </div>
  )
}

function MetaCard({ inc }: { inc: Incident }) {
  const dur = inc.resolvedAt
    ? new Date(inc.resolvedAt).getTime() - new Date(inc.createdAt).getTime()
    : Date.now() - new Date(inc.createdAt).getTime()

  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-4">
        <h2 className="font-medium">Details</h2>
      </CardHeader>
      <CardContent className="pb-4 flex flex-col gap-2 text-sm">
        <Row label="Service" value={inc.service || "—"} />
        <Row label="Detected" value={`${relativeTime(inc.createdAt)}`} />
        <Row label={inc.resolvedAt ? "Resolved" : "Open for"} value={formatDuration(dur)} />
        <Row label="Files" value={inc.filesChanged?.length ? inc.filesChanged.join(", ") : "—"} mono />
        <Row
          label="Owners"
          value={
            inc.responsibleDevs.length
              ? inc.responsibleDevs.map((d) => d.name).join(", ")
              : "—"
          }
        />
        {inc.commit ? (
          <Row label="Commit" value={`${inc.commit.sha.slice(0, 7)} — ${inc.commit.message}`} mono />
        ) : null}
        {inc.pr ? (
          <div className="flex justify-between gap-4 items-start">
            <span className="text-muted-foreground text-xs">PR</span>
            <a
              href={inc.pr.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs hover:underline inline-flex items-center gap-1 text-right break-words"
            >
              #{inc.pr.number} {inc.pr.title}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        ) : null}
        {inc.url ? (
          <div className="flex justify-between gap-4 items-start">
            <span className="text-muted-foreground text-xs">Source link</span>
            <a
              href={inc.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs hover:underline inline-flex items-center gap-1"
            >
              View in {inc.source}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-muted-foreground text-xs shrink-0">{label}</span>
      <span className={cn("text-xs text-right break-words", mono && "font-mono")}>{value}</span>
    </div>
  )
}

function SimilarIncidentsCard({ similar }: { similar: Incident[] }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-4">
        <h2 className="font-medium">Similar incidents</h2>
      </CardHeader>
      <CardContent className="pb-4">
        {similar.length === 0 ? (
          <p className="text-sm text-muted-foreground">None in the last 30 days.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {similar.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/incidents/${s.id}`}
                  className="flex items-start gap-2 rounded-md border border-border bg-secondary/40 p-2 hover:bg-secondary text-sm"
                >
                  <SeverityPill severity={s.severity} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{relativeTime(s.createdAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function TimelineCard({ inc }: { inc: Incident }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-4">
        <h2 className="font-medium">Timeline</h2>
      </CardHeader>
      <CardContent className="pb-4">
        <ol className="relative flex flex-col gap-4">
          <span className="absolute left-1.5 top-1.5 bottom-1.5 w-px bg-border" aria-hidden />
          {inc.timeline.map((t) => (
            <li key={t.id} className="relative pl-6 text-sm">
              <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-accent" />
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  {t.kind}
                </span>
                <span className="text-[11px] text-muted-foreground">{relativeTime(t.ts)}</span>
              </div>
              <p className="text-foreground/90 mt-0.5">{t.message}</p>
              <p className="text-[11px] text-muted-foreground">{t.actor}</p>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function SlackThreadMirror({ inc }: { inc: Incident }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CornerDownRight className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-medium">Slack thread</h2>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">#incidents</span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {inc.slackThread.length === 0 ? (
          <p className="text-sm text-muted-foreground">No replies yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {inc.slackThread.map((m) => (
              <div key={m.id} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-mono uppercase",
                    m.isBot
                      ? "bg-accent/15 text-accent border border-accent/40"
                      : "bg-secondary text-muted-foreground border border-border",
                  )}
                >
                  {m.isBot ? "BB" : m.user.name.slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{m.user.name}</span>
                    <span className="text-[11px] text-muted-foreground">{relativeTime(m.ts)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap mt-0.5">{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PostmortemCard({ inc, postmortem }: { inc: Incident; postmortem: Postmortem | null }) {
  if (!postmortem) return null
  return (
    <Card className="bg-card border-border">
      <CardHeader className="py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-success" />
          <h2 className="font-medium">Postmortem</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{relativeTime(postmortem.generatedAt)}</span>
      </CardHeader>
      <CardContent className="pb-5">
        <Tabs defaultValue="summary">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="actions">Action items</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4 flex flex-col gap-4">
            <Section label="Summary" body={postmortem.summary} />
            <Section label="Root cause" body={postmortem.rootCause} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <List label="What went well" items={postmortem.whatWentWell} />
              <List label="What went wrong" items={postmortem.whatWentWrong} />
            </div>
          </TabsContent>
          <TabsContent value="timeline" className="mt-4">
            <pre className="font-mono text-xs whitespace-pre-wrap text-muted-foreground">
              {postmortem.timelineMarkdown}
            </pre>
          </TabsContent>
          <TabsContent value="actions" className="mt-4">
            {postmortem.actionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No action items.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {postmortem.actionItems.map((a, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-md border border-border bg-secondary/40 p-3"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mt-0.5 shrink-0">
                      {a.dueInDays}d
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">Owner: {a.owner}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
        <p className="text-[10px] text-muted-foreground mt-3">Incident {inc.id}</p>
      </CardContent>
    </Card>
  )
}

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((i, idx) => (
            <li key={idx} className="text-sm text-foreground/90">
              · {i}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
