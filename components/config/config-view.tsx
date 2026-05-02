"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OnboardingConfig } from "./onboarding-config"
import { OwnersConfig } from "./owners-config"
import { EscalationConfig } from "./escalation-config"
import { SeverityConfig } from "./severity-config"
import { BlackoutConfig } from "./blackout-config"
import { AutopilotConfig } from "./autopilot-config"
import { IntegrationsConfig } from "./integrations-config"
import { NLConfigPanel } from "./nl-config"
import { Skeleton } from "@/components/ui/skeleton"

function ConfigTabs() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get("tab") || "start"

  function onTabChange(value: string) {
    router.push(`/config?tab=${value}`, { scroll: false })
  }

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="w-full">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="start">Getting Started</TabsTrigger>
        <TabsTrigger value="owners">Owners</TabsTrigger>
        <TabsTrigger value="escalation">Escalation</TabsTrigger>
        <TabsTrigger value="severity">Severity</TabsTrigger>
        <TabsTrigger value="blackout">Blackout</TabsTrigger>
        <TabsTrigger value="autopilot">Autopilot</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="nl">AI Config</TabsTrigger>
      </TabsList>
      <TabsContent value="start" className="mt-4">
        <OnboardingConfig />
      </TabsContent>
      <TabsContent value="owners" className="mt-4">
        <OwnersConfig />
      </TabsContent>
      <TabsContent value="escalation" className="mt-4">
        <EscalationConfig />
      </TabsContent>
      <TabsContent value="severity" className="mt-4">
        <SeverityConfig />
      </TabsContent>
      <TabsContent value="blackout" className="mt-4">
        <BlackoutConfig />
      </TabsContent>
      <TabsContent value="autopilot" className="mt-4">
        <AutopilotConfig />
      </TabsContent>
      <TabsContent value="integrations" className="mt-4">
        <IntegrationsConfig />
      </TabsContent>
      <TabsContent value="nl" className="mt-4">
        <NLConfigPanel />
      </TabsContent>
    </Tabs>
  )
}

export function ConfigView() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <ConfigTabs />
    </Suspense>
  )
}
