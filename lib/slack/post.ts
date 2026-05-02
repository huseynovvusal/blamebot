// Slack posters that *also* mirror every message into the incident's KV-stored
// slackThread + timeline so the dashboard remains the source of truth even when
// Slack is not configured.

import { kv } from "../kv"
import type { Incident, SlackMessage, TimelineEvent } from "../types"
import { messageId, eventId } from "../ids"
import { chatPostMessage, chatPostInThread, INCIDENTS_CHANNEL, isSlackConfigured } from "./client"
import { incidentReportBlocks, postmortemBlocks } from "./blocks"

async function appendThread(inc: Incident, msg: SlackMessage, tlKind: TimelineEvent["kind"], tlMessage: string) {
  inc.slackThread.push(msg)
  inc.timeline.push({
    id: eventId(),
    ts: msg.ts,
    kind: tlKind,
    actor: msg.user.id,
    message: tlMessage,
  })
  await kv.incidents.update(inc)
}

export async function postIncidentReport(inc: Incident): Promise<Incident> {
  const blocks = incidentReportBlocks(inc)
  const text = `${inc.severity} — ${inc.title}`
  const now = new Date().toISOString()

  if (isSlackConfigured()) {
    const r = await chatPostMessage({ channel: INCIDENTS_CHANNEL, text, blocks })
    if (r) {
      inc.slackChannelId = r.channel
      inc.slackThreadTs = r.ts
    }
  }

  await appendThread(
    inc,
    {
      id: messageId(),
      ts: now,
      user: { id: "BlameBot", name: "BlameBot" },
      text,
      isBot: true,
      blocks,
    },
    "ai_report",
    "AI incident report posted",
  )
  return inc
}

export async function postReply(inc: Incident, opts: { actor: { id: string; name: string }; text: string }) {
  const now = new Date().toISOString()

  if (isSlackConfigured() && inc.slackChannelId && inc.slackThreadTs) {
    await chatPostInThread({
      channel: inc.slackChannelId,
      thread_ts: inc.slackThreadTs,
      text: opts.text,
    })
  }

  await appendThread(
    inc,
    {
      id: messageId(),
      ts: now,
      user: opts.actor,
      text: opts.text,
      isBot: opts.actor.id === "BlameBot",
    },
    opts.actor.id === "BlameBot" ? "slack_post" : "slack_reply",
    opts.text,
  )
}

export async function postEscalation(inc: Incident, contact: { slackUserId: string; name: string }) {
  const text = `:loudspeaker: Escalating to <@${contact.slackUserId}> — no response in ${
    Math.round((Date.now() - new Date(inc.createdAt).getTime()) / 60000) || 1
  }m on ${inc.severity} incident.`

  if (isSlackConfigured() && inc.slackChannelId && inc.slackThreadTs) {
    await chatPostInThread({
      channel: inc.slackChannelId,
      thread_ts: inc.slackThreadTs,
      text,
    })
  }

  inc.slackThread.push({
    id: messageId(),
    ts: new Date().toISOString(),
    user: { id: "BlameBot", name: "BlameBot" },
    text,
    isBot: true,
  })
  inc.timeline.push({
    id: eventId(),
    ts: new Date().toISOString(),
    kind: "escalation",
    actor: "BlameBot",
    message: `Escalated to ${contact.name}`,
  })
  await kv.incidents.update(inc)
}

export async function postPostmortem(
  inc: Incident,
  pm: import("../types").Postmortem,
): Promise<void> {
  const blocks = postmortemBlocks(pm)
  const text = `Postmortem ready for ${inc.title}`

  if (isSlackConfigured() && inc.slackChannelId && inc.slackThreadTs) {
    await chatPostInThread({
      channel: inc.slackChannelId,
      thread_ts: inc.slackThreadTs,
      text,
      blocks,
    })
  }

  inc.slackThread.push({
    id: messageId(),
    ts: new Date().toISOString(),
    user: { id: "BlameBot", name: "BlameBot" },
    text,
    isBot: true,
    blocks,
  })
  inc.timeline.push({
    id: eventId(),
    ts: new Date().toISOString(),
    kind: "postmortem",
    actor: "BlameBot",
    message: "Postmortem generated",
  })
  await kv.incidents.update(inc)
}
