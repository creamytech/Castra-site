import { prisma } from '@/lib/prisma'

export type SchedulingPrefs = {
  timeZone: string
  workHours: { start: number; end: number }
  meetingLenMinutes: number
  quietHours?: { start?: number; end?: number }
}

const ALLOW_DOMAINS = new Set<string>([
  'google.com', 'meet.google.com', 'calendar.google.com',
  'zoom.us', 'us02web.zoom.us',
  'castra.ai'
])

const DENY_PATTERNS: RegExp[] = [
  /\b(short|bitly|tinyurl|t\.co)\b/i,
]

export function filterUnsafeLinks(htmlOrText: string): string {
  try {
    // Remove script/style
    let out = htmlOrText.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    // Replace links with non-allowlisted domains
    out = out.replace(/https?:\/\/[^\s"')]+/gi, (url) => {
      try {
        const u = new URL(url)
        const host = (u.hostname || '').toLowerCase()
        if (isAllowlistedHost(host)) return url
        if (DENY_PATTERNS.some(rx => rx.test(host) || rx.test(url))) return ''
        return ''
      } catch { return '' }
    })
    return out
  } catch {
    return htmlOrText
  }
}

function isAllowlistedHost(host: string): boolean {
  if (ALLOW_DOMAINS.has(host)) return true
  const arr = Array.from(ALLOW_DOMAINS)
  for (let i = 0; i < arr.length; i++) {
    const d = arr[i]
    if (host.endsWith('.' + d)) return true
  }
  return false
}

export async function getStyleGuide(userId: string) {
  const [profile, memories] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.memory.findMany({ where: { userId } })
  ])
  const tone = memories.find(m => m.key === 'tone')?.value || null
  const signature = memories.find(m => m.key === 'signature')?.value || null
  return { styleGuide: profile?.styleGuide || null, tone, signature }
}

export async function getAcceptedDraftSnippets(userId: string, limit = 25) {
  const drafts = await prisma.draft.findMany({ where: { userId, status: { in: ['approved','sent'] } }, orderBy: { updatedAt: 'desc' }, take: limit })
  return drafts.map(d => ({ id: d.id, subject: d.subject, bodyText: d.bodyText, updatedAt: d.updatedAt }))
}

export async function getSchedulingPrefs(userId: string): Promise<SchedulingPrefs> {
  const [profile, policies] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.autonomyPolicy.findMany({ where: { userId } })
  ])
  const quietStart = policies.reduce<number | undefined>((acc, p) => typeof p.quietStart === 'number' ? (acc ?? p.quietStart) : acc, undefined)
  const quietEnd = policies.reduce<number | undefined>((acc, p) => typeof p.quietEnd === 'number' ? (acc ?? p.quietEnd) : acc, undefined)
  const tz = (profile?.styleGuide as any)?.timeZone || 'America/New_York'
  const meetingLenMinutes = (profile?.styleGuide as any)?.meetingLenMinutes || 60
  const workHours = (profile?.styleGuide as any)?.workHours || { start: 9, end: 18 }
  return { timeZone: tz, workHours, meetingLenMinutes, quietHours: { start: quietStart, end: quietEnd } }
}


