import { AppShell } from "@/components/app-shell"
import { AnalyticsView } from "@/components/analytics/analytics-view"

export const dynamic = "force-dynamic"

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1600px]">
        <header>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">30-day trends</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How often things break, where, and who&apos;s doing the heavy lifting.
          </p>
        </header>
        <AnalyticsView />
      </div>
    </AppShell>
  )
}
