import { customAlphabet } from "nanoid"

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz"
const nano = customAlphabet(alphabet, 10)

export function incidentId(): string {
  return `inc_${nano()}`
}

export function eventId(): string {
  return `evt_${nano()}`
}

export function messageId(): string {
  return `msg_${nano()}`
}
