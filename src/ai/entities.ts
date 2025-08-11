import { z } from 'zod'

export type ExtractedEntities = {
  name?: string
  email?: string
  phone?: string
  address?: string
  price?: number
  beds?: number
  baths?: number
  timeline?: string
  windows?: { start?: string; end?: string; text?: string }[]
}

const phoneRegex = /\b\+?1?\s*(?:\(|-)?\s*\d{3}\s*(?:\)|-)?\s*[\s.-]?\s*\d{3}\s*[\s.-]?\s*\d{4}\b/g
const currencyRegex = /(\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\s?k|\d+\s?mm|\d+\s?million)/ig
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const addressHint = /(\d+\s+[\w\s]+\b(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Drive|Dr|Ln|Lane|Ct|Court|Way|Terrace|Pl|Place)\b[^\n,]*)/i
const bedsRegex = /(\d+)\s*(?:bed|beds|br)/i
const bathsRegex = /(\d+(?:\.\d+)?)\s*(?:bath|baths|ba)/i
const timeToken = /(today|tomorrow|sat(?:urday)?|sun(?:day)?|mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|weekend|morning|afternoon|evening|night|\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b)/ig

export function normalizePhone(input?: string | null): string | undefined {
  if (!input) return undefined
  const only = input.replace(/[^\d]/g, '')
  if (only.length === 10) return `+1-${only.slice(0,3)}-${only.slice(3,6)}-${only.slice(6)}`
  if (only.length === 11 && only.startsWith('1')) return `+1-${only.slice(1,4)}-${only.slice(4,7)}-${only.slice(7)}`
  return undefined
}

export function normalizeCurrency(token?: string | null): number | undefined {
  if (!token) return undefined
  const t = token.toLowerCase().replace(/[,\$\s]/g, '')
  if (/mm|million/.test(t)) return Number(t.replace(/mm|million/, '')) * 1_000_000
  if (/k$/.test(t)) return Number(t.replace(/k/, '')) * 1_000
  const asNum = Number(t)
  return Number.isFinite(asNum) ? asNum : undefined
}

export function extractEntities(subject: string, body: string): ExtractedEntities {
  const hay = `${subject}\n${body}`
  const email = hay.match(emailRegex)?.[0]
  const phone = normalizePhone(hay.match(phoneRegex)?.[0])
  const price = normalizeCurrency(hay.match(currencyRegex)?.[0] || undefined)
  const address = hay.match(addressHint)?.[0]?.trim()
  const beds = (() => { const m = hay.match(bedsRegex); return m ? Number(m[1]) : undefined })()
  const baths = (() => { const m = hay.match(bathsRegex); return m ? Number(m[1]) : undefined })()
  const tokens = [...hay.matchAll(timeToken)].map(m => m[0])
  const windows = tokens.length ? [{ text: tokens.join(' ') }] : []
  return { email, phone, price, address, beds, baths, timeline: tokens.join(' ') || undefined, windows }
}


