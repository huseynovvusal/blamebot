import { z } from "zod"

export const SeveritySchema = z.enum(["P1", "P2", "P3"])
export const IncidentStatusSchema = z.enum(["active", "acknowledged", "resolved"])
export const IncidentSourceSchema = z.enum(["vercel", "sentry", "uptime", "manual", "seed"])

export const OwnerSchema = z.object({
  slackUserId: z.string().min(1),
  name: z.string().min(1),
})

export const OwnerRuleSchema = z.object({
  pattern: z.string().min(1),
  owners: z.array(OwnerSchema).min(1),
})

export const OwnersConfigSchema = z.array(OwnerRuleSchema)

export const EscalationConfigSchema = z.object({
  delayMinutes: z.number().int().min(1).max(120),
  contacts: z.array(
    z.object({
      slackUserId: z.string().min(1),
      name: z.string().min(1),
      severity: SeveritySchema,
    }),
  ),
})

export const SeverityRuleSchema = z.object({
  severity: SeveritySchema,
  errorIncludes: z.array(z.string()).optional(),
  sourceIs: z.array(IncidentSourceSchema).optional(),
  isDeploymentFailure: z.boolean().optional(),
  isSiteDown: z.boolean().optional(),
})

export const SeverityConfigSchema = z.object({
  defaultSeverity: SeveritySchema,
  rules: z.array(SeverityRuleSchema),
})

export const BlackoutConfigSchema = z.object({
  enabled: z.boolean(),
  tz: z.string().min(1),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(0).max(23),
  fallbackContact: z
    .object({
      slackUserId: z.string().min(1),
      name: z.string().min(1),
    })
    .nullable(),
})

export const AutopilotConfigSchema = z.object({
  enabled: z.boolean(),
  perSeverity: z.object({
    P1: z.boolean(),
    P2: z.boolean(),
    P3: z.boolean(),
  }),
  delayMinutes: z.number().int().min(1).max(60),
})

// AI report schema (used with AI SDK Output.object)
export const AIReportSchema = z.object({
  rootCause: z.string().describe("One paragraph plain-English explanation of why this likely happened."),
  blastRadius: z
    .string()
    .describe("Who or what is affected. Include user-facing impact and which services are degraded."),
  recommendedAction: z
    .string()
    .describe("Single concrete next step. If a rollback is recommended, say so explicitly."),
  recommendedActionType: z.enum(["rollback", "hotfix", "investigate", "monitor"]),
  historicalContext: z
    .string()
    .describe("Reference any similar past incidents in the same file or service, if provided in context."),
  confidence: z.enum(["high", "medium", "low"]),
})

export const NLConfigUpdateSchema = z.object({
  intent: z.enum(["add_owner", "set_escalation", "set_severity_rule", "set_blackout", "set_autopilot", "unknown"]),
  summary: z.string().describe("One-sentence plain English description of what changed."),
  ownersPatch: z
    .object({
      pattern: z.string(),
      owners: z.array(z.object({ slackUserId: z.string(), name: z.string() })),
    })
    .nullable(),
  escalationPatch: EscalationConfigSchema.nullable(),
  severityRulePatch: SeverityRuleSchema.nullable(),
  blackoutPatch: BlackoutConfigSchema.nullable(),
  autopilotPatch: AutopilotConfigSchema.nullable(),
})

export const PostmortemSchema = z.object({
  summary: z.string(),
  rootCause: z.string(),
  timelineMarkdown: z.string().describe("Markdown bullet list of timeline events with timestamps."),
  whatWentWell: z.array(z.string()),
  whatWentWrong: z.array(z.string()),
  actionItems: z.array(
    z.object({
      owner: z.string(),
      description: z.string(),
      dueInDays: z.number().int().min(1).max(30),
    }),
  ),
})
