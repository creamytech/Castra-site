import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || ''
    const unread = searchParams.get('unread')
    const hasDeal = searchParams.get('hasDeal')
    const folder = (searchParams.get('folder') || 'all').toLowerCase()
    const category = (searchParams.get('category') || 'primary').toLowerCase()
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
          // Keep DB order simple to avoid provider-specific aggregate issues; we'll sort in JS by last message date
          orderBy: { lastSyncedAt: 'desc' },
          skip: (page - 1) * takeBase,
          take: takeBase,
          include: { deal: true, messages: { select: { intent: true, snippet: true, bodyText: true, from: true, date: true, internalRefs: true }, orderBy: { date: 'desc' }, take: 1 } },
        })
      ])
      const mapIntentToStatus = (intent?: string | null) => {
        const i = (intent || '').toUpperCase()
        if (i.includes('OFFER')) return 'lead'
        if (i.includes('SHOWING') || i.includes('INTEREST')) return 'potential'
        if (i.includes('SPAM') || i.includes('UNSUB')) return 'no_lead'
        return 'follow_up'
      }
      const scoreFor = (status: string) => status === 'lead' ? 85 : status === 'potential' ? 70 : status === 'no_lead' ? 10 : 55
      const extract = (txt: string) => {
        const phone = (txt.match(/\b\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/) || [])[0]
        const price = (txt.match(/\b(?:\$\s?)?\d{2,3}(?:,\d{3})*(?:\s?k|\s?mm|\s?million)?\b/i) || [])[0]
        const addr = (txt.match(/\b\d+\s+[A-Za-z].+?(St|Ave|Rd|Blvd|Dr|Ln|Ct)\b/i) || [])[0]
        return { phone, price, address: addr }
      }
      const threadsRaw = rows.map((t: any) => {
        const last = t.messages?.[0]
        const status = t.status || mapIntentToStatus(last?.intent)
        const score = typeof t.score === 'number' ? t.score : scoreFor(status)
        const combined = `${last?.snippet || ''} ${last?.bodyText || ''}`
        const extracted = t.extracted || extract(combined)
        const reasons = (Array.isArray(t.reasons) ? t.reasons : [t.reasons]).filter(Boolean)
        const labelIds = (last?.internalRefs as any)?.labelIds || []
        const unreadFlag = Array.isArray(labelIds) ? labelIds.includes('UNREAD') : false
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
        return { id: t.id, userId: t.userId, subject: t.subject, lastSyncedAt: t.lastSyncedAt, lastMessageAt, deal: t.deal || null, status, score, reasons, extracted, preview: last?.snippet || last?.bodyText || '', unread: unreadFlag, labelIds, fromName, fromEmail }
      })

      const matchFolder = (tr: any) => {
        const labels: string[] = Array.isArray(tr.labelIds) ? tr.labelIds : []
        switch (folder) {
          case 'all': return true
          case 'unread': return tr.unread
          case 'starred': return labels.includes('STARRED')
          case 'spam': return labels.includes('SPAM')
          case 'trash': return labels.includes('TRASH')
          case 'drafts': return labels.includes('DRAFT')
          case 'inbox':
          default:
            return labels.includes('INBOX') || (!labels.includes('SPAM') && !labels.includes('TRASH'))
        }
      }

      const matchCategory = (tr: any) => {
        const labels: string[] = Array.isArray(tr.labelIds) ? tr.labelIds : []
        const isPromotions = labels.includes('CATEGORY_PROMOTIONS')
        const isSocial = labels.includes('CATEGORY_SOCIAL')
        const isUpdates = labels.includes('CATEGORY_UPDATES')
        const isForums = labels.includes('CATEGORY_FORUMS')
        const isOther = !isPromotions && !isSocial && !isUpdates && !isForums
        switch (category) {
          case 'promotions': return isPromotions
          case 'social': return isSocial
          case 'updates': return isUpdates
          case 'forums': return isForums
          case 'all': return true
          case 'primary':
          default:
            return isOther || labels.includes('CATEGORY_PERSONAL')
        }
      }

      const threads = threadsRaw
        .filter(matchFolder)
        .filter(matchCategory)
        // Stable, strict sort by last message time only
        .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, limit)
      return NextResponse.json({ total, page, limit, threads })
    }

    // Fallback: group by Message.threadId
    // Fallback to raw Gmail messages cache if threads not materialized
    const messages = await prisma.message.findMany({ where: { userId: ctx.session.user.id }, orderBy: { internalDate: 'desc' }, take: 200 })
    const map = new Map<string, any>()
    for (const m of messages) {
      if (q && !(m.subject?.toLowerCase().includes(q.toLowerCase()) || m.from?.toLowerCase().includes(q.toLowerCase()))) continue
      const t = map.get(m.threadId) || { id: m.threadId, userId: ctx.session.user.id, subject: m.subject, lastSyncedAt: m.internalDate, lastMessageAt: m.internalDate, preview: m.snippet }
      if (new Date(m.internalDate) > new Date(t.lastSyncedAt)) {
        t.subject = m.subject
        t.lastSyncedAt = m.internalDate
        t.lastMessageAt = m.internalDate
        t.preview = m.snippet
      }
      map.set(m.threadId, t)
    }
    const all = Array.from(map.values()).sort((a: any, b: any) => new Date(b.lastMessageAt || b.lastSyncedAt).getTime() - new Date(a.lastMessageAt || a.lastSyncedAt).getTime())
    const total = all.length
    const threads = all.slice((page - 1) * limit, (page - 1) * limit + limit)
    return NextResponse.json({ total, page, limit, threads })
  } catch (e: any) {
    console.error('[inbox threads GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'inbox.threads.list' })
