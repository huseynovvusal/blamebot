import { AppShell } from "@/components/app-shell"
import { IncidentsView } from "@/components/incidents/incidents-view"

export const dynamic = "force-dynamic"

export default function IncidentsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1600px]">
        <header>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">All incidents</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse, filter, and export every signal that has hit BlameBot.
          </p>
        </header>
        <IncidentsView />
      </div>
    </AppShell>
  )
}
