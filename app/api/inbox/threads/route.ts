import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { enqueue } from '@/lib/agent/queue'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'
import { applyInboxRules } from '@/src/ai/classifier/rules'
import { classifyLead } from '@/src/ai/classifyLead'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const unread = searchParams.get('unread')
    const hasDeal = searchParams.get('hasDeal')
    const folder = (searchParams.get('folder') || 'all').toLowerCase()
    // Remove Gmail categories; show all mail regardless of Google categories
    const category = 'all'
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 100)

    // First try EmailThread
    const countThreads = await prisma.emailThread.count({ where: { userId: ctx.session.user.id, orgId: ctx.orgId } })
    if (countThreads > 0) {
      const where: any = { userId: ctx.session.user.id, orgId: ctx.orgId }
      if (q) where.subject = { contains: q, mode: 'insensitive' }
      if (hasDeal === 'true') where.dealId = { not: null }
      if (hasDeal === 'false') where.dealId = null
      // unread filter would need flags; skip for now

      // If searching, augment local cache by querying Gmail for the last 90 days
      if (q) {
        try {
          const { oauth2 } = await getGoogleAuthForUser(ctx.session.user.id)
          const gmail = gmailClient(oauth2)
          // Append newer_than if user didn't specify a time window
          const remoteQ = (q.match(/newer_than:\s*\d+[dwmy]/) ? q : `newer_than:90d ${q}`).trim()
          const list = await gmail.users.messages.list({ userId: 'me', q: remoteQ, maxResults: 100 })
          const ids = (list.data.messages || []).map(m => m.id!).filter(Boolean)
          for (const id of ids) {
            try {
              const m = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
              const data = m.data
              const threadId = data.threadId!
              const headers = (data.payload?.headers || []) as any[]
              const h = Object.fromEntries(headers.map((hh: any) => [hh.name.toLowerCase(), hh.value])) as any
              const subject = h['subject'] || null
              const from = h['from'] || ''
              const to = (h['to'] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
              const cc = (h['cc'] || '').split(',').map((s: string) => s.trim()).filter(Boolean)
              const date = new Date(Number(data.internalDate))
              const snippet = data.snippet || ''
              const upThread = await prisma.emailThread.upsert({
                where: { id: threadId },
                create: { id: threadId, userId: ctx.session.user.id, orgId: ctx.orgId, subject, lastSyncedAt: new Date() },
                update: { subject, lastSyncedAt: new Date() },
              })
              const parts: any[] = []
              const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts || []).forEach((pp: any) => walk(pp)) }
              walk(data.payload)
              let bodyText = ''
              let bodyHtml = ''
              for (const p of parts) {
                const b64 = p.body?.data
                if (!b64) continue
                const buff = Buffer.from(String(b64).replace(/-/g,'+').replace(/_/g,'/'), 'base64')
                const txt = buff.toString('utf-8')
                if (p.mimeType?.includes('text/plain')) bodyText += txt
                if (p.mimeType?.includes('text/html')) bodyHtml += txt
              }
              await prisma.emailMessage.upsert({
                where: { id: id! },
                create: { id, threadId, userId: ctx.session.user.id, orgId: ctx.orgId, from, to, cc, date, snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null, internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })) },
                update: { snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null, internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })) },
              })
              // lightweight heuristic status for badges on search
              const text = `${subject || ''} ${snippet || ''}`.toLowerCase()
              const status = /offer/.test(text) ? 'lead' : /(tour|showing|interested|looking)/.test(text) ? 'potential' : /(unsubscribe|promo|sale)/.test(text) ? 'no_lead' : 'follow_up'
              const score = status === 'lead' ? 85 : status === 'potential' ? 70 : status === 'no_lead' ? 10 : 55
              await prisma.emailThread.update({ where: { id: threadId }, data: { status, score } })
            } catch {}
          }
        } catch {}
      }

      const takeBase = Math.min(limit * 3, 500)
      const [total, rows] = await Promise.all([
        prisma.emailThread.count({ where }),
        prisma.emailThread.findMany({
          where,
          orderBy: { lastSyncedAt: 'desc' },
          skip: (page - 1) * takeBase,
          take: takeBase,
          select: {
            id: true,
            userId: true,
            subject: true,
            lastSyncedAt: true,
            dealId: true,
            status: true,
            score: true,
            reasons: true,
            extracted: true,
            messages: { select: { intent: true, snippet: true, bodyText: true, from: true, date: true, internalRefs: true }, orderBy: { date: 'desc' }, take: 1 }
          },
        })
      ])
      let llmBudget = 30
      const threadsRaw = await Promise.all(rows.map(async (t: any) => {
        const last = t.messages?.[0]
        const combined = `${last?.snippet || ''} ${last?.bodyText || ''}`
        const labelIds = (last?.internalRefs as any)?.labelIds || []
        const unreadFlag = Array.isArray(labelIds) ? labelIds.includes('UNREAD') : false

        // Apply rules layer
        const rules = applyInboxRules({ subject: t.subject || '', text: combined, headers: { from: last?.from || '' } })

        // Optionally apply LLM layer; guard errors
        let llm: { isLead: boolean; score: number; reason: string; fields: any; confidence?: number; needs_confirmation?: boolean } | null = null
        const shouldCallLLM = rules.uncertainty || (rules.rulesScore >= 30 && rules.rulesScore <= 85)
        if (shouldCallLLM && llmBudget > 0) {
          try {
            llm = await classifyLead({ subject: t.subject || '', body: combined })
            llmBudget -= 1
          } catch {
            llm = null
          }
        }

        // Blend scoring
        const llmScore = llm?.score ?? 0
        const wRules = 0.55
        const wLlm = 0.45
        const baseScore = Math.round(wRules * rules.rulesScore + wLlm * llmScore)
        const bonus = (rules.extracted.phone ? 5 : 0) + (rules.extracted.timeAsk ? 5 : 0)
        const score = Math.max(0, Math.min(100, baseScore + bonus))

        // Status decision
        const isLead = typeof llm?.isLead === 'boolean' ? llm!.isLead : rules.isLead
        const status = isLead ? 'lead' : (vendorOrNoLead(rules, llm) ? 'no_lead' : rules.uncertainty ? 'potential' : 'follow_up')

        // Reasons and extracted
        const reasons = [
          ...rules.reasons,
          ...(rules.conflicts.length ? rules.conflicts.map(c => `conflict:${c}`) : []),
          ...(llm?.reason ? [ `llm:${llm.reason}` ] : []),
        ]
        const extracted = t.extracted || { ...rules.extracted, ...(llm?.fields || {}) }

        // Confidence and needs_confirmation
        const confidence = llm?.confidence ?? (rules.uncertainty ? 0.55 : 0.75)
        const needs_confirmation = llm?.needs_confirmation ?? (confidence < 0.6)

        // Persist lightweight updates for this thread
        try {
          await prisma.emailThread.update({ where: { id: t.id }, data: { status, score, reasons, extracted } })
        } catch {}

        // Parse from header into name/email if available
        let fromName: string | null = null
        let fromEmail: string | null = null
        if (last?.from) {
          const m = String(last.from).match(/^(.*?)(<([^>]+)>)?$/)
          if (m) {
            fromName = (m[1] || '').trim().replace(/"/g, '') || null
            fromEmail = (m[3] || '').trim() || null
          }
        }
        const lastMessageAt = last?.date || t.lastMessageAt || t.updatedAt || t.createdAt || t.lastSyncedAt

        // Compute priority
        const priority = computePriority(score, unreadFlag, rules, llm)
        const quickActions = buildQuickActions({ rules, threadId: t.id, lastFrom: last?.from || '', subject: t.subject || '' })

        return { id: t.id, userId: t.userId, subject: t.subject, lastSyncedAt: t.lastSyncedAt, lastMessageAt, deal: t.deal || null, status, score, priority, reasons, extracted, quickActions, preview: last?.snippet || last?.bodyText || '', unread: unreadFlag, labelIds, fromName, fromEmail, confidence, needs_confirmation }
      }))

      const matchFolder = (tr: any) => {
        const labels: string[] = Array.isArray(tr.labelIds) ? tr.labelIds : []
        switch (folder) {
          case 'all': return true
          case 'unread': return tr.unread
          case 'starred': return labels.includes('STARRED')
          case 'spam': return labels.includes('SPAM')
          case 'trash': return labels.includes('TRASH')
          case 'archived': return !labels.includes('INBOX') && !labels.includes('SPAM') && !labels.includes('TRASH')
          case 'drafts': return labels.includes('DRAFT')
          case 'inbox':
          default:
            return labels.includes('INBOX') || (!labels.includes('SPAM') && !labels.includes('TRASH'))
        }
      }

      const matchCategory = (_tr: any) => true

      const threads = threadsRaw
        .filter(matchFolder)
        .filter(matchCategory)
        // Stable, strict sort by last message time only
        .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, limit)
      return NextResponse.json({ total, page, limit, threads })
    }

    // Fallback: group by Message.threadId and compute lightweight status/score heuristics
    const messages = await prisma.message.findMany({ where: { userId: ctx.session.user.id }, orderBy: { internalDate: 'desc' }, take: 400 })
    const map = new Map<string, any>()
    const latestByThread = new Map<string, any>()
    for (const m of messages) {
      if (q && !(m.subject?.toLowerCase().includes(q.toLowerCase()) || m.from?.toLowerCase().includes(q.toLowerCase()))) continue
      const t = map.get(m.threadId) || { id: m.threadId, userId: ctx.session.user.id, subject: m.subject, lastSyncedAt: m.internalDate, lastMessageAt: m.internalDate, preview: m.snippet }
      if (new Date(m.internalDate) > new Date(t.lastSyncedAt)) {
        t.subject = m.subject
        t.lastSyncedAt = m.internalDate
        t.lastMessageAt = m.internalDate
        t.preview = m.snippet
        latestByThread.set(m.threadId, m)
      }
      map.set(m.threadId, t)
    }
    const all = Array.from(map.values()).sort((a: any, b: any) => new Date(b.lastMessageAt || b.lastSyncedAt).getTime() - new Date(a.lastMessageAt || a.lastSyncedAt).getTime())
    const total = all.length
    const windowed = all.slice((page - 1) * limit, (page - 1) * limit + limit)
    // Compute status/score using rules only; also persist an EmailThread row to stabilize future fetches
    const threads = await Promise.all(windowed.map(async (t: any) => {
      const last = latestByThread.get(t.id)
      const combined = `${t.preview || ''}`
      const rules = applyInboxRules({ subject: t.subject || '', text: combined, headers: { from: last?.from || '' } })
      const status = rules.isLead ? 'lead' : (rules.uncertainty ? 'potential' : 'follow_up')
      const score = Math.max(0, Math.min(100, rules.rulesScore + (rules.extracted.phone ? 5 : 0) + (rules.extracted.timeAsk ? 5 : 0)))
      // Try to upsert basic EmailThread to persist computed values
      try {
        await prisma.emailThread.upsert({
          where: { id: t.id },
          create: { id: t.id, userId: ctx.session.user.id, orgId: ctx.orgId, subject: t.subject, lastSyncedAt: new Date(t.lastSyncedAt), status, score, reasons: rules.reasons as any, extracted: rules.extracted as any },
          update: { subject: t.subject, lastSyncedAt: new Date(t.lastSyncedAt), status, score, reasons: rules.reasons as any, extracted: rules.extracted as any },
        })
      } catch {}
      return { ...t, status, score, reasons: rules.reasons, extracted: rules.extracted }
    }))
    return NextResponse.json({ total, page, limit, threads })
  } catch (e: any) {
    console.error('[inbox threads GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.threads.list' })

function vendorOrNoLead(rules: ReturnType<typeof applyInboxRules>, llm: any | null): boolean {
  const vendor = rules.reasons.some(r => r.includes('vendor'))
  const llmVendor = typeof llm?.fields?.sourceType === 'string' && llm.fields.sourceType === 'vendor'
  return vendor || llmVendor
}

function computePriority(score: number, unread: boolean, rules: ReturnType<typeof applyInboxRules>, llm: any | null): number {
  let p = score
  if (unread) p += 5
  if (rules.extracted.timeAsk) p += 7
  if (rules.extracted.phone) p += 5
  const llmConf = typeof llm?.confidence === 'number' ? llm.confidence : (rules.uncertainty ? 0.55 : 0.75)
  p += Math.round((llmConf - 0.5) * 20)
  return Math.max(0, Math.min(100, p))
}

function buildQuickActions(params: { rules: ReturnType<typeof applyInboxRules>, threadId: string, lastFrom: string, subject: string }) {
  const { rules, threadId, lastFrom, subject } = params
  const actions: Array<{ type: string; label: string; payload?: any }> = []
  if (rules.extracted.showingRequest || rules.extracted.timeAsk) {
    actions.push({ type: 'propose_times', label: 'Propose showing times', payload: { threadId } })
  }
  if (rules.extracted.prequalification) {
    actions.push({ type: 'send_preapproval', label: 'Send pre-approval checklist', payload: { threadId, to: lastFrom } })
  }
  if (rules.extracted.pricingQuestion || /cma|price/i.test(subject)) {
    actions.push({ type: 'start_cma', label: 'Start CMA', payload: { threadId } })
  }
  return actions
}
