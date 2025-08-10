import { prisma } from '@/lib/prisma'
import { enqueue } from './queue'
import { sendEmail } from './skills/gmail'
import { sendSMS } from './skills/sms'
import { createCalendarEvent } from './skills/calendar'
import { getMlsProvider } from './skills/mls'
import { buyerCadence, sellerCadence } from './policies/cadences'
import OpenAI from 'openai'
import { buildPrompt } from './policies/replies'

export type AgentEvent =
  | { type: 'INBOUND_EMAIL'; userId: string; dealId?: string; text: string; headers?: any; threadId?: string }
  | { type: 'INBOUND_SMS'; userId: string; dealId?: string; from: string; text: string }
  | { type: 'INBOUND_IGDM'; userId: string; dealId?: string; igUserId: string; text: string }
  | { type: 'MANUAL_CREATE'; userId: string; dealId?: string; intent?: string; goal?: string }
  | { type: 'CALENDAR_INVITE'; userId: string; dealId?: string; summary: string; startISO: string; endISO: string }
  | { type: 'TIMER_FOLLOWUP'; userId: string; dealId?: string }
  | { type: 'ANALYZE_VOICE'; userId: string }

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export async function handleEvent(event: AgentEvent) {
  // Load context
  const userId = event.userId
  const dealId: string | undefined = (event as any).dealId
  const deal = dealId ? await prisma.deal.findFirst({ where: { id: dealId, userId }, include: { leadPreference: true, interactions: { orderBy: { occurredAt: 'desc' }, take: 5 } } }) : null
  const stage = deal?.stage || 'LEAD'
  const policy = await prisma.autonomyPolicy.findFirst({ where: { userId, stage } })

  // Decide tasks
  const tasks: Array<{ type: string; payload: any; runAt?: number }> = []

  if (event.type === 'INBOUND_EMAIL' || event.type === 'INBOUND_SMS' || event.type === 'INBOUND_IGDM') {
    tasks.push({ type: 'REPLY', payload: { channel: event.type === 'INBOUND_EMAIL' ? 'email' : event.type === 'INBOUND_SMS' ? 'sms' : 'ig', dealId: deal?.id, userId, text: (event as any).text, threadId: (event as any).threadId } })
  }
  if (event.type === 'CALENDAR_INVITE' && deal) {
    tasks.push({ type: 'SCHEDULE_SHOWING', payload: { userId, dealId: deal.id, summary: event.summary, startISO: event.startISO, endISO: event.endISO } })
  }
  if (event.type === 'TIMER_FOLLOWUP' && deal) {
    tasks.push({ type: 'FOLLOWUP', payload: { userId, dealId: deal.id } })
  }
  if (event.type === 'MANUAL_CREATE') {
    tasks.push({ type: 'DRAFT', payload: { userId, dealId: deal?.id, intent: (event as any).intent, goal: (event as any).goal } })
  }
  if (event.type === 'ANALYZE_VOICE') {
    tasks.push({ type: 'ANALYZE_VOICE', payload: { userId } })
  }

  for (const t of tasks) {
    await prisma.task.create({ data: { userId, dealId: deal?.id, type: t.type, payload: t.payload, runAt: t.runAt ? new Date(t.runAt) : new Date() } })
    await enqueue(t.type, { ...t.payload, userId, dealId: deal?.id }, t.runAt)
  }

  return { queued: tasks.length }
}

function withinQuietHours(policy?: { quietStart: number | null; quietEnd: number | null }) {
  if (!policy?.quietStart && !policy?.quietEnd) return false
  const now = new Date()
  const hour = now.getHours()
  const start = policy?.quietStart ?? -1
  const end = policy?.quietEnd ?? -1
  if (start < 0 || end < 0) return false
  if (start < end) return hour >= start && hour < end
  return hour >= start || hour < end
}

export async function runTask(task: { id: string; type: string; payload: any; userId: string; dealId?: string }) {
  const userId = task.userId
  const deal = task.dealId ? await prisma.deal.findFirst({ where: { id: task.dealId, userId }, include: { leadPreference: true, interactions: { orderBy: { occurredAt: 'desc' }, take: 10 } } }) : null
  const stage = deal?.stage || 'LEAD'
  const policy = await prisma.autonomyPolicy.findFirst({ where: { userId, stage } })

  // enforce quiet hours
  if (withinQuietHours(policy ?? undefined)) {
    const next = new Date()
    next.setHours((policy?.quietEnd ?? 8), 5, 0, 0)
    await prisma.task.update({ where: { id: task.id }, data: { status: 'PENDING', runAt: next } })
    return { rescheduled: true }
  }

  try {
    if (task.type === 'REPLY' || task.type === 'DRAFT') {
      const channel = task.payload.channel || 'email'
      const prompt = await buildPrompt({ userId, deal, interactions: deal?.interactions || [], leadPreference: deal?.leadPreference, channel, intent: task.payload.intent, goal: task.payload.goal })
      if (!openai) throw new Error('OpenAI not configured')
      const completion = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [ { role: 'system', content: prompt.system }, { role: 'user', content: prompt.user } ], temperature: 0.4, max_tokens: 300 })
      const draft = `${completion.choices[0]?.message?.content || ''}${prompt.signature ? `\n\n${prompt.signature}` : ''}`

      if (!policy || policy.level === 'SUGGEST') {
        await prisma.task.update({ where: { id: task.id }, data: { status: 'NEEDS_APPROVAL', result: { draft } } })
        return { status: 'NEEDS_APPROVAL' }
      }
      if (policy.level === 'ASK') {
        await prisma.notification.create({ data: { userId, type: 'draft', title: 'Approve reply draft', body: draft, link: task.dealId ? `/crm/deals/${task.dealId}` : '/crm' } })
        await prisma.task.update({ where: { id: task.id }, data: { status: 'NEEDS_APPROVAL', result: { draft } } })
        return { status: 'NEEDS_APPROVAL' }
      }
      // AUTO
      if (channel === 'email') {
        // In absence of full contact in this context, keep approval workflow
        await prisma.task.update({ where: { id: task.id }, data: { status: 'NEEDS_APPROVAL', result: { draft, note: 'Missing recipient email; needs approval' } } })
        return { status: 'NEEDS_APPROVAL' }
      } else if (channel === 'sms') {
        // likewise, need phone
        await prisma.task.update({ where: { id: task.id }, data: { status: 'NEEDS_APPROVAL', result: { draft, note: 'Missing recipient phone; needs approval' } } })
        return { status: 'NEEDS_APPROVAL' }
      }
    }

    // Hook: assign cadence when a new deal is created (placeholder: create tasks when we see MANUAL_CREATE DRAFT with missing history)
    if (task.type === 'ASSIGN_CADENCE') {
      if (!deal) return { status: 'FAILED' }
      const cadence = (deal.type === 'SELLER') ? sellerCadence : buyerCadence
      const base = Date.now()
      for (const step of cadence) {
        const runAt = base + step.delayHrs * 3600 * 1000
        await prisma.task.create({ data: { userId, dealId: deal.id, type: step.action === 'SEND_LISTINGS' ? 'SEND_LISTINGS' : (step.action === 'SEND_CMA' ? 'SEND_CMA' : 'DRAFT'), status: 'PENDING', payload: { template: step.template }, runAt: new Date(runAt) } })
      }
      await prisma.task.update({ where: { id: task.id }, data: { status: 'DONE' } })
      return { status: 'DONE' }
    }

    if (task.type === 'SCHEDULE_SHOWING') {
      const created = await createCalendarEvent(userId, task.payload)
      const createdSafe = JSON.parse(JSON.stringify(created))
      await prisma.interaction.create({ data: { userId, dealId: task.dealId || undefined, channel: 'calendar', direction: 'out', subject: task.payload.summary, body: '', meta: { created: createdSafe } } })
      await prisma.task.update({ where: { id: task.id }, data: { status: 'DONE', result: { created: createdSafe } } })
      return { status: 'DONE' }
    }

    if (task.type === 'FOLLOWUP') {
      // simple: create draft reply
      await prisma.task.update({ where: { id: task.id }, data: { status: 'PENDING', type: 'DRAFT' } })
      return { status: 'PENDING' }
    }

    if (task.type === 'SEND_LISTINGS') {
      if (!deal) throw new Error('No deal')
      const prefs: any = deal.leadPreference || {}
      const mls = getMlsProvider()
      const listings = await mls.searchListings({ city: deal.city || undefined, priceMin: (prefs.priceMin as number | undefined) || deal.priceTarget || undefined, priceMax: (prefs.priceMax as number | undefined) || undefined, bedsMin: (prefs.beds as number | undefined) || undefined, bathsMin: (prefs.baths as number | undefined) || undefined, limit: 6 })
      const top = listings.slice(0, 3)
      const content = top.map(l => `${l.address}, ${l.city} — $${l.price.toLocaleString()} (${l.beds}bd/${l.baths}ba)`).join('\n')
      await prisma.task.update({ where: { id: task.id }, data: { status: 'NEEDS_APPROVAL', result: { draft: `Here are 3 homes that match your criteria:\n${content}\nWould you like to see any of these?` } } })
      return { status: 'NEEDS_APPROVAL' }
    }

    if (task.type === 'SEND_CMA') {
      const address = task.payload?.address || deal?.propertyAddr || 'your property'
      const mls = getMlsProvider()
      const comps = await mls.getComps({ address, city: deal?.city || undefined, beds: deal?.leadPreference?.beds || undefined, baths: deal?.leadPreference?.baths || undefined, sqft: undefined })
      await prisma.task.update({ where: { id: task.id }, data: { status: 'NEEDS_APPROVAL', result: { draft: `Attached is a quick market analysis for ${address}. Top comps: ${comps.comps.slice(0,3).map(r => `${r.address} $${r.price.toLocaleString()}`).join(', ')}.` } } })
      return { status: 'NEEDS_APPROVAL' }
    }

    await prisma.task.update({ where: { id: task.id }, data: { status: 'FAILED', error: 'Unknown task type' } })
    return { status: 'FAILED' }
  } catch (e: any) {
    await prisma.task.update({ where: { id: task.id }, data: { status: 'FAILED', error: e?.message || 'error' } })
    return { status: 'FAILED', error: e?.message }
  }
}
