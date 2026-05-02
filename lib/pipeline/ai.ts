import { generateText, Output } from "ai"
import { AIReportSchema, NLConfigUpdateSchema, PostmortemSchema } from "../schemas"
import type { Incident, Postmortem } from "../types"
import { z } from "zod"

const MODEL = "anthropic/claude-sonnet-4-5"

export async function generateIncidentReport(opts: {
  incident: Incident
  similar: Incident[]
}): Promise<z.infer<typeof AIReportSchema>> {
  const { incident, similar } = opts

  const similarSummary = similar.length
    ? similar
        .map(
          (s, i) =>
            `${i + 1}. [${s.severity}] ${s.title} (${new Date(s.createdAt).toISOString().slice(0, 10)}) — files: ${
              (s.filesChanged ?? []).slice(0, 3).join(", ") || "n/a"
            }. resolution: ${s.resolvedAt ? "resolved" : "unresolved"}.`,
        )
        .join("\n")
    : "(none)"

  try {
    const { experimental_output } = await generateText({
      model: MODEL,
      system:
        "You are BlameBot, an incident-response assistant. You write tight, plain-English analysis for engineers. " +
        "Avoid hedging filler. Be specific. If a rollback is the obvious move, say so.",
      prompt: [
        `INCIDENT`,
        `Source: ${incident.source}`,
        `Severity: ${incident.severity}`,
        `Service: ${incident.service}`,
        `Title: ${incident.title}`,
        `Error message:\n${incident.errorMessage}`,
        incident.commit ? `Commit: ${incident.commit.sha} — ${incident.commit.message || "(no msg)"}` : "",
        incident.pr ? `PR: #${incident.pr.number} — ${incident.pr.title}` : "",
        incident.filesChanged?.length ? `Files changed: ${incident.filesChanged.slice(0, 12).join(", ")}` : "",
        ``,
        `RECENT SIMILAR INCIDENTS (last 30 days, same files):`,
        similarSummary,
        ``,
        `Produce a structured report.`,
      ]
        .filter(Boolean)
        .join("\n"),
      experimental_output: Output.object({ schema: AIReportSchema }),
    })
    return experimental_output
  } catch (e) {
    console.error("[v0] AI report failed, using heuristic fallback:", e)
    return heuristicReport(incident)
  }
}

function heuristicReport(inc: Incident): z.infer<typeof AIReportSchema> {
  const isDeploy = inc.title.toLowerCase().includes("deploy") || inc.source === "vercel"
  return {
    rootCause: isDeploy
      ? `A recent deployment failed${inc.pr ? ` (PR #${inc.pr.number})` : ""}. Build or runtime error: ${inc.errorMessage.slice(0, 160)}.`
      : `Service ${inc.service} reported: ${inc.errorMessage.slice(0, 160)}.`,
    blastRadius: isDeploy
      ? "Production traffic may be receiving stale or erroring responses."
      : "Affected users will see degraded behavior in this service.",
    recommendedAction: isDeploy ? "Roll back to the previous deployment." : "Investigate the failing service.",
    recommendedActionType: isDeploy ? "rollback" : "investigate",
    historicalContext: "Heuristic fallback — AI Gateway not configured or unavailable.",
    confidence: "low",
  }
}

export async function generatePostmortem(opts: { incident: Incident }): Promise<Omit<Postmortem, "incidentId" | "generatedAt">> {
  const { incident } = opts
  const timeline = incident.timeline
    .map((t) => `- ${new Date(t.ts).toISOString()} [${t.kind}] ${t.actor}: ${t.message}`)
    .join("\n")
  try {
    const { experimental_output } = await generateText({
      model: MODEL,
      system:
        "You are BlameBot. Write a calm, blameless postmortem. Reference real timestamps from the timeline. " +
        "Keep prose tight. Action items must be concrete.",
      prompt: [
        `INCIDENT: ${incident.title}`,
        `Severity: ${incident.severity}`,
        `Service: ${incident.service}`,
        `Error: ${incident.errorMessage}`,
        incident.aiReport ? `Initial AI analysis: ${JSON.stringify(incident.aiReport)}` : "",
        ``,
        `TIMELINE:`,
        timeline,
      ]
        .filter(Boolean)
        .join("\n"),
      experimental_output: Output.object({ schema: PostmortemSchema }),
    })
    return experimental_output
  } catch (e) {
    console.error("[v0] AI postmortem failed, using fallback:", e)
    return {
      summary: `${incident.severity} incident on ${incident.service}: ${incident.title}.`,
      rootCause: incident.aiReport?.rootCause ?? incident.errorMessage,
      timelineMarkdown: timeline,
      whatWentWell: ["Detection was automated.", "Responsible engineer was paged immediately."],
      whatWentWrong: ["Validation in CI did not catch this before production."],
      actionItems: [
        { owner: "oncall", description: "Add regression test for this code path.", dueInDays: 7 },
        { owner: "oncall", description: "Document this rollback playbook.", dueInDays: 14 },
      ],
    }
  }
}

export async function parseNLConfig(text: string) {
  try {
    const { experimental_output } = await generateText({
      model: MODEL,
      system:
        "You translate plain-English Slack/admin instructions into structured BlameBot config patches. " +
        "Output exactly one patch field — leave the others null. If the user's intent is unclear, set intent=unknown.",
      prompt: `User said: """${text}"""

Examples of intents you can fulfill:
- "Make Sarah responsible for billing/* code" → add_owner
- "Page eng-lead after 5 minutes for P1" → set_escalation
- "Treat anything in payments code as P1" → set_severity_rule
- "Don't page anyone between 10pm and 7am, fall back to Maya" → set_blackout
- "Enable autopilot rollback for P1 after 10 minutes" → set_autopilot

Return one patch.`,
      experimental_output: Output.object({ schema: NLConfigUpdateSchema }),
    })
    return experimental_output
  } catch (e) {
    console.error("[v0] AI parseNLConfig failed:", e)
    return {
      intent: "unknown" as const,
      summary: "Could not parse instruction.",
      ownersPatch: null,
      escalationPatch: null,
      severityRulePatch: null,
      blackoutPatch: null,
      autopilotPatch: null,
    }
  }
}

export async function answerQuestion(question: string, incident: Incident): Promise<string> {
  try {
    const { text } = await generateText({
      model: MODEL,
      system:
        "You are BlameBot, answering a Slack reply about an in-flight incident. Be concise (≤4 sentences). " +
        "Reference concrete details from the incident context if relevant.",
      prompt: [
        `INCIDENT CONTEXT:`,
        JSON.stringify(
          {
            title: incident.title,
            severity: incident.severity,
            service: incident.service,
            error: incident.errorMessage,
            aiReport: incident.aiReport,
            similarIncidentIds: incident.similarIncidentIds,
            files: incident.filesChanged,
          },
          null,
          2,
        ),
        ``,
        `QUESTION:`,
        question,
      ].join("\n"),
    })
    return text
  } catch {
    return "I'm here, but I can't reach the AI Gateway right now. Try `rollback` or `hotfix` for actions."
  }
}
