"use client"

import { Activity, FlaskConical, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { postJSON } from "@/lib/fetcher"
import { mutate } from "swr"
import { CandyButton } from "@/components/candy-button"
import { Dot, Triangle } from "@/components/decorations"

export function DashboardHeader() {
  const router = useRouter()
  const [seeding, setSeeding] = useState(false)

  async function seed() {
    setSeeding(true)
    try {
      await postJSON("/api/seed", {})
      await mutate(() => true, undefined, { revalidate: true })
      router.refresh()
    } catch (e) {
      console.error("[v0] seed failed", e)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <header className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
      <Dot tone="amber" size={18} className="absolute -left-3 top-2 hidden md:block float-slow" />
      <Triangle tone="pink" size={20} rotate={20} className="absolute -right-2 top-0 hidden md:block float-slow" />
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-widest pop-shadow-static">
          <Activity className="h-3 w-3 text-primary" strokeWidth={2.75} />
          Live operations
        </span>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-balance">
          Incident overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground text-pretty max-w-xl">
          Real-time view of every Vercel, Sentry, and UptimeRobot signal — triaged, owned, and explained by AI.
        </p>
      </div>
      <CandyButton onClick={seed} disabled={seeding} tone="amber" size="md">
        {seeding ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.75} /> Seeding…
          </>
        ) : (
          <>
            <FlaskConical className="h-4 w-4" strokeWidth={2.75} /> Load demo data
          </>
        )}
      </CandyButton>
    </header>
  )
}
