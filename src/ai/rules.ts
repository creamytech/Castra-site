type Args = { subject: string; body: string; from: string; headers?: Record<string, string> }

export function ruleScore({ subject, body, from, headers }: Args) {
  let s = 0
  const hay = `${subject}\n${body}`
  if (/\b(schedule|tour|showing|see|view|open house|list my|sell my|cma|offer|pre-?approved)\b/i.test(hay)) s += 25
  if (/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/.test(body)) s += 15
  if (/\b(?:\$|\d+(?:\s)?k|\d+(?:\s)?mm|million)\b/i.test(body)) s += 10
  if (/\b\d+\s+[A-Za-z].+?\b(St|Ave|Rd|Blvd|Dr|Lane|Ln|Court|Ct)\b/i.test(body)) s += 10
  if (/zillow|realtor|redfin|homes?\.com|showingtime|reply\.zillow/i.test((from || '') + JSON.stringify(headers || {}))) s += 15
  if (/unsubscribe|newsletter|marketing preferences/i.test(body)) s -= 25
  return Math.max(0, Math.min(60, s))
}

export function blend(rule: number, llm: number) {
  return Math.round(Math.min(100, rule + Math.round(llm * 0.4)))
}

export function decideStatus({ score, llmReason }: { score: number; llmReason?: string }) {
  const reason = (llmReason || '').toLowerCase()
  if (/vendor|newsletter/.test(reason) && score < 60) return 'no_lead'
  if (score >= 80) return 'lead'
  if (score >= 60) return 'potential'
  return 'no_lead'
}


