type Args = { subject: string; body: string; from: string; headers?: Record<string, string> }

export function ruleScore({ subject, body, from, headers }: Args) {
  let s = 0
  const hay = `${subject}\n${body}`
  // Strong real estate lead indicators
  if (/\b(schedule|tour|showing|see|view|open\s*house|list\s*my|sell\s*my|cma|offer|pre-?approved|preapproval|lender|escrow|hoa|mortgage|down\s*payment)\b/i.test(hay)) s += 30
  if (/\b\d{3}[-.)\s]?\d{3}[-.\s]?\d{4}\b/.test(body)) s += 15
  if (/\b(?:\$|\d+(?:\s)?k|\d+(?:\s)?mm|million)\b/i.test(body)) s += 10
  if (/\b\d+\s+[A-Za-z].+?\b(St|Ave|Rd|Blvd|Dr|Lane|Ln|Court|Ct|Way|Terrace|Pl|Place)\b/i.test(body)) s += 12
  if (/zillow|realtor|redfin|homes?\.com|showingtime|reply\.zillow|mls\b|streeteasy/i.test((from || '') + JSON.stringify(headers || {}) + hay)) s += 15
  if (/unsubscribe|newsletter|marketing\s+preferences|mailchimp|constant\s*contact/i.test(hay)) s -= 35
  if (/noreply@|no-?reply@/i.test(from)) s -= 10
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

export function classifyByRules(input: Args): { status: 'lead'|'potential'|'no_lead'|'follow_up'; reasons: string[] } {
  const hay = `${input.subject}\n${input.body}`.toLowerCase()
  const reasons: string[] = []
  if (/unsubscribe|newsletter|marketing\s+preferences|no-?reply@/.test(hay + ' ' + (input.from||'').toLowerCase())) {
    reasons.push('newsletter')
  }
  if (/(tour|showing|open\s*house|pre-?approved|preapproval|offer|cma|mortgage|escrow|hoa)/.test(hay)) reasons.push('real_estate_intent')
  if (/(zillow|redfin|realtor|showingtime|mls|streeteasy)/.test(hay)) reasons.push('portal_source')
  const score = ruleScore(input)
  const status = score >= 80 ? 'lead' : score >= 60 ? 'potential' : reasons.includes('newsletter') ? 'no_lead' : 'follow_up'
  return { status, reasons }
}


