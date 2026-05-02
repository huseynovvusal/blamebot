import { AppShell } from "@/components/app-shell"
import { IncidentDetail } from "@/components/incidents/incident-detail"

export const dynamic = "force-dynamic"

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <AppShell>
      <IncidentDetail id={id} />
    </AppShell>
  )
}
