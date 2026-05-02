import { AppShell } from "@/components/app-shell"
import { ConfigView } from "@/components/config/config-view"

export const dynamic = "force-dynamic"

export default function ConfigPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6 p-6 lg:p-8 max-w-[1400px]">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Configuration</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Owner rules, escalation, severity, blackout, autopilot, and integrations.
          </p>
        </header>
        <ConfigView />
      </div>
    </AppShell>
  )
}
