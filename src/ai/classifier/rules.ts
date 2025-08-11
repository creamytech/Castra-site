export type RulesExtracted = {
  phone?: string | null
  price?: string | null
  address?: string | null
  timeAsk?: boolean
  sourceType?: 'buyer' | 'seller' | 'renter' | 'vendor' | 'unknown'
  portal?: string | null
}

export type RulesResult = {
  isLead: boolean
  reasons: string[]
  extracted: RulesExtracted
  conflicts: string[]
  rulesScore: number // 0-100
  uncertainty: boolean
}

const PORTAL_DOMAINS = [
  'zillow.com',
  'trulia.com',
  'realtor.com',
  'redfin.com',
  'homes.com',
  'apartments.com',
  'hotpads.com',
]

const VENDOR_KEYWORDS = [
  'unsubscribe',
  'manage preferences',
  'newsletter',
  'promo',
  'sale',
  'limited time',
  'webinar',
  'sponsorship',
]

const JOB_PITCH_KEYWORDS = [
  'resume', 'cv', 'candidate', 'job', 'position', 'apply', 'application', 'hiring'
]

const RECEIPT_NOTIFICATION_KEYWORDS = [
  'receipt', 'notification', 'no-reply', 'noreply', 'do-not-reply'
]

const TIME_KEYWORDS = [
  'tour',
  'showing',
  'schedule',
  'available',
  'availability',
  'tomorrow',
  'today',
  'this week',
  'next week',
  'weekend',
  'morning',
  'afternoon',
  'evening',
  'time',
]

function extractPhone(text: string): string | null {
  const m = text.match(/\b\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/)
  return m ? m[0] : null
}

function extractPrice(text: string): string | null {
  const m = text.match(/\b(?:\$\s?)?\d{2,3}(?:,\d{3})*(?:\s?k|\s?mm|\s?million)?\b/i)
  return m ? m[0] : null
}

function extractAddress(text: string): string | null {
  const m = text.match(/\b\d+\s+[A-Za-z].+?(?:St|Ave|Rd|Blvd|Dr|Ln|Ct|Way|Pkwy|Place|Pl|Terrace|Ter)\b/i)
  return m ? m[0] : null
}

export function applyInboxRules(input: {
  subject?: string
  text?: string
  headers?: Record<string, string>
}): RulesResult {
  const subject = (input.subject || '').toLowerCase()
  const text = (input.text || '').toLowerCase()
  const headers = input.headers || {}

  const reasons: string[] = []
  const conflicts: string[] = []
  const extracted: RulesExtracted = {}

  // Domain heuristics
  const fromHeader = Object.keys(headers).find(h => h.toLowerCase() === 'from')
  const fromValue = fromHeader ? String(headers[fromHeader]) : ''
  let portal: string | null = null
  for (const d of PORTAL_DOMAINS) {
    if (fromValue.toLowerCase().includes(`@${d}`) || subject.includes(d)) {
      portal = d
      break
    }
  }
  if (portal) {
    extracted.portal = portal
    reasons.push(`portal:${portal}`)
  }

  // Vendor/newsletter heuristics
  const vendorHit = VENDOR_KEYWORDS.some(k => subject.includes(k) || text.includes(k))
  if (vendorHit) reasons.push('vendor/newsletter-signals')

  const jobPitchHit = JOB_PITCH_KEYWORDS.some(k => subject.includes(k) || text.includes(k))
  if (jobPitchHit) reasons.push('job-pitch')

  const receiptHit = RECEIPT_NOTIFICATION_KEYWORDS.some(k => subject.includes(k) || text.includes(k))
  if (receiptHit) reasons.push('receipt/notification')

  // Time ask heuristics
  const timeAsk = TIME_KEYWORDS.some(k => subject.includes(k) || text.includes(k))
  if (timeAsk) {
    extracted.timeAsk = true
    reasons.push('time-ask')
  }

  // Extract entities
  const phone = extractPhone(text)
  const price = extractPrice(text)
  const address = extractAddress(text)
  if (phone) { extracted.phone = phone; reasons.push('has-phone') }
  if (price) { extracted.price = price; reasons.push('has-price') }
  if (address) { extracted.address = address; reasons.push('has-address') }

  // Source type guess
  let sourceType: RulesExtracted['sourceType'] = 'unknown'
  if (portal) sourceType = 'buyer'
  if (/listing|sell|list my|cma/.test(subject) || /listing|sell/.test(text)) sourceType = 'seller'
  extracted.sourceType = sourceType

  // Conflicts: vendor but lead-ish signals
  if (vendorHit && (phone || timeAsk || address || price)) {
    conflicts.push('vendor+lead-signals')
  }

  // Compute rules score per spec
  let rulesScore = 0
  // Additives
  const tourVerb = /(tour|showing|schedule|see|view)/.test(subject) || /(tour|showing|schedule|see|view)/.test(text)
  if (tourVerb) rulesScore += 25
  if (address) rulesScore += 10
  if (timeAsk) rulesScore += 10
  if (price) rulesScore += 10
  if (phone) rulesScore += 15
  if (portal) rulesScore += 15
  // Demoters
  if (vendorHit) rulesScore -= 25
  if (jobPitchHit) rulesScore -= 20
  if (receiptHit) rulesScore -= 20
  rulesScore = Math.max(0, Math.min(100, rulesScore))

  // Force override: tour/showing verb and any context
  const anyContext = !!(address || timeAsk || price || phone)
  if (tourVerb && anyContext) {
    rulesScore = Math.max(85, rulesScore)
    reasons.push('override:tour+context')
  }

  // Decide isLead based on thresholds
  const isLead = rulesScore >= 80 && !vendorHit
  const uncertainty = conflicts.length > 0 || (rulesScore >= 58 && rulesScore <= 62)

  return { isLead, reasons, extracted, conflicts, rulesScore, uncertainty }
}


