import { AppShell } from "@/components/app-shell"
import { DashboardHeader } from "@/components/dashboard/header"
import { DemoBanner } from "@/components/dashboard/demo-banner"
import { StatsRow } from "@/components/dashboard/stats-row"
import { LiveIncidentFeed } from "@/components/dashboard/live-incident-feed"
import { IntegrationsRail } from "@/components/dashboard/integrations-rail"
import { TopOffenders } from "@/components/dashboard/top-offenders"
import { ActivityFeed } from "@/components/dashboard/activity-feed"

export const dynamic = "force-dynamic"

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1600px]">
        <DashboardHeader />
        <DemoBanner />
        <StatsRow />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <LiveIncidentFeed />
            <ActivityFeed />
          </div>
          <div className="flex flex-col gap-6">
            <IntegrationsRail />
            <TopOffenders />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
