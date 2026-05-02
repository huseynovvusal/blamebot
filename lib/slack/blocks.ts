import type { Incident, Postmortem } from "../types"

const APP_URL = process.env.APP_URL || ""

function incidentLink(id: string): string {
  return APP_URL ? `${APP_URL}/incidents/${id}` : `/incidents/${id}`
}

export function incidentReportBlocks(inc: Incident) {
  const sevEmoji = inc.severity === "P1" ? ":rotating_light:" : inc.severity === "P2" ? ":warning:" : ":memo:"
  const respText = inc.responsibleDevs.length
    ? inc.responsibleDevs.map((o) => `<@${o.slackUserId}>`).join(" ")
    : "_no owner mapped_"
  const ai = inc.aiReport

  const headerText = `${sevEmoji} *${inc.severity} — ${inc.title}*`
  const fields: { type: string; text: string }[] = [
    { type: "mrkdwn", text: `*Service:*\n${inc.service || "—"}` },
    { type: "mrkdwn", text: `*Source:*\n${inc.source}` },
    { type: "mrkdwn", text: `*Responsible:*\n${respText}` },
    { type: "mrkdwn", text: `*Started:*\n<!date^${Math.floor(new Date(inc.createdAt).getTime() / 1000)}^{date_short_pretty} {time}|${inc.createdAt}>` },
  ]

  const blocks: unknown[] = [
    { type: "section", text: { type: "mrkdwn", text: headerText } },
    { type: "section", fields },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error:*\n\`\`\`${inc.errorMessage.slice(0, 800)}\`\`\``,
      },
    },
  ]

  if (ai) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*AI analysis* (_confidence: ${ai.confidence}_)\n` +
          `> *Root cause:* ${ai.rootCause}\n` +
          `> *Blast radius:* ${ai.blastRadius}\n` +
          `> *Recommended:* ${ai.recommendedAction}\n` +
          (ai.historicalContext ? `> *History:* ${ai.historicalContext}` : ""),
      },
    })
  }

  if (inc.pr) {
    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `:git: <${inc.pr.url}|PR #${inc.pr.number} — ${inc.pr.title}>`,
        },
      ],
    })
  }

  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        action_id: "rollback",
        text: { type: "plain_text", text: "Rollback" },
        style: "danger",
        value: inc.id,
      },
      {
        type: "button",
        action_id: "hotfix",
        text: { type: "plain_text", text: "Draft hotfix PR" },
        value: inc.id,
      },
      {
        type: "button",
        action_id: "autopilot",
        text: { type: "plain_text", text: "Enable autopilot" },
        value: inc.id,
      },
      {
        type: "button",
        action_id: "resolve",
        text: { type: "plain_text", text: "Mark resolved" },
        value: inc.id,
      },
      {
        type: "button",
        action_id: "view",
        text: { type: "plain_text", text: "Open in dashboard" },
        url: incidentLink(inc.id),
        value: inc.id,
      },
    ],
  })

  return blocks
}

export function postmortemBlocks(p: Postmortem) {
  const ai = [
    `*Postmortem — ${p.incidentId}*`,
    "",
    `*Summary:* ${p.summary}`,
    `*Root cause:* ${p.rootCause}`,
    "",
    `*Timeline:*`,
    p.timelineMarkdown,
    "",
    `*What went well:*`,
    ...p.whatWentWell.map((x) => `• ${x}`),
    "",
    `*What went wrong:*`,
    ...p.whatWentWrong.map((x) => `• ${x}`),
    "",
    `*Action items:*`,
    ...p.actionItems.map((a) => `• [@${a.owner}] ${a.description} _(due in ${a.dueInDays}d)_`),
  ].join("\n")
  return [{ type: "section", text: { type: "mrkdwn", text: ai } }]
}
