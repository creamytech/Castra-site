import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import { getGoogleAuthForUser, gmailClient } from '@/lib/gmail/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const POST = withAuth(async ({ ctx }) => {
  try {

    const { oauth2 } = await getGoogleAuthForUser(ctx.session.user.id)
    const gmail = gmailClient(oauth2)

    // List recent messages prefer inbox last 14 days; fallback to 60d anywhere
    let q = 'newer_than:14d in:inbox'
    let list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50 })
    if (!list.data.messages?.length) {
      q = 'newer_than:60d in:anywhere'
      list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 50 })
    }
    const ids = (list.data.messages || []).map(m => m.id!).filter(Boolean)
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, synced: 0, counts: { threads: 0, messages: 0 }, note: 'No messages matched query' })
    }

    const classify = (subject: string, snippet: string) => {
      const text = `${subject} ${snippet}`.toLowerCase()
      const hasTour = /(tour|showing|visit|view(ing)?)/.test(text)
      const hasOffer = /(offer|counter|contract)/.test(text)
      const hasInterest = /(interested|looking|buy|rent|sell)/.test(text)
      const isSpam = /(unsubscribe|promo|sale)/.test(text)
      const phone = (snippet.match(/\b\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/) || [])[0]
      const price = (snippet.match(/\b(?:\$\s?)?\d{2,3}(?:,\d{3})*(?:\s?k|\s?mm|\s?million)?\b/i) || [])[0]
      const addr = (snippet.match(/\b\d+\s+[A-Za-z].+?(St|Ave|Rd|Blvd|Dr|Ln|Ct)\b/i) || [])[0]
      const timePhrase = /(today|tomorrow|sat|sun|mon|tue|wed|thu|fri|weekend|\b\d{1,2}(:\d{2})?\s?(am|pm)\b)/i.test(snippet)

      // Intent string
      let intent = 'GENERAL'
      if (hasTour) intent = 'SHOWING_REQUEST'
      else if (hasOffer) intent = 'OFFER_DISCUSSION'
      else if (hasInterest) intent = 'LEAD_INTEREST'
      else if (isSpam) intent = 'POSSIBLE_SPAM'

      // Lead override: tour intent with context
      const hasContext = !!(addr || price || phone || timePhrase)
      const reasons: string[] = []
      if (hasTour) reasons.push('tour_request')
      if (addr) reasons.push('address')
      if (price) reasons.push('budget')
      if (phone) reasons.push('phone')
      if (timePhrase) reasons.push('time_window')

      let status: 'lead'|'potential'|'no_lead'|'follow_up' = 'follow_up'
      if (hasOffer) status = 'lead'
      else if (hasTour && hasContext) status = 'lead'
      else if (hasTour || hasInterest) status = 'potential'
      else if (isSpam) status = 'no_lead'

      let score = status === 'lead' ? 85 : status === 'potential' ? 70 : status === 'no_lead' ? 10 : 55
      if (status === 'lead' && hasTour && hasContext) score = Math.max(score, 85)

      return { intent, status, score, reasons, extracted: { phone, price, address: addr } }
    }

    let fetched = 0
    let upsertedThreads = 0
    let upsertedMessages = 0
    for (const id of ids) {
      const m = await gmail.users.messages.get({ userId: 'me', id: id!, format: 'full' })
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

      const parts: any[] = []
      const walk = (p: any) => { if (!p) return; parts.push(p); (p.parts || []).forEach((pp: any) => walk(pp)) }
      walk(data.payload)
      let bodyText = ''
      let bodyHtml = ''
      for (const p of parts) {
        const b64 = p.body?.data
        if (!b64) continue
        const buff = Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
        const text = buff.toString('utf-8')
        if (p.mimeType?.includes('text/plain')) bodyText += text
        if (p.mimeType?.includes('text/html')) bodyHtml += text
      }

      const upThread = await prisma.emailThread.upsert({
        where: { id: threadId },
        create: { id: threadId, userId: ctx.session.user.id, orgId: ctx.orgId, subject, lastSyncedAt: new Date() },
        update: { subject, lastSyncedAt: new Date() },
      })
      if (upThread) upsertedThreads++

      const c = classify(subject || '', snippet || '')

      const upMsg = await prisma.emailMessage.upsert({
        where: { id: id! },
        create: {
          id: id!, threadId, userId: ctx.session.user.id, orgId: ctx.orgId, from, to, cc, date, snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null,
          internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })),
          intent: c.intent,
        },
        update: { snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null, internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })), intent: c.intent },
      })
      if (upMsg) upsertedMessages++

      // Persist computed status/score on thread for UI badges
      await prisma.emailThread.update({ where: { id: threadId }, data: { status: c.status, score: c.score, reasons: c.reasons, extracted: c.extracted } })

      // Auto-create Contact + Deal idempotently if lead/potential
      if (c.status === 'lead' || c.status === 'potential') {
        const sender = from
        const emailMatch = sender.match(/"?([^\"]+)"?\s*<([^>]+)>/)
        const name = emailMatch ? emailMatch[1].trim() : (sender.split('@')[0] || 'Lead')
        const email = emailMatch ? emailMatch[2] : (sender.includes('@') ? sender : undefined)
        const phone = c.extracted?.phone || undefined
        // Upsert contact by email or phone
        let contact: any = null
        if (email) {
          contact = await prisma.contact.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, email: { equals: email, mode: 'insensitive' } } })
        }
        if (!contact && phone) {
          contact = await prisma.contact.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, phone: phone } })
        }
        if (!contact) {
          contact = await prisma.contact.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, firstName: name.split(' ')[0] || 'Lead', lastName: name.split(' ').slice(1).join(' '), email: email || null, phone: phone || null, tags: ['lead'] } })
        }
        // Idempotent deal: de-dupe by threadId or contact+stage LEAD
        let deal = await prisma.deal.findFirst({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, OR: [ { emailThreads: { some: { id: threadId } } }, { contactId: contact?.id, stage: 'LEAD' } ] } as any })
        if (!deal) {
          const maxPos = await prisma.deal.aggregate({ _max: { position: true }, where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage: 'LEAD' } })
          const nextPos = (maxPos._max.position ?? 0) + 1
          deal = await prisma.deal.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, contactId: contact?.id || undefined, leadId: null, title: subject || 'New Lead', type: 'BUYER', stage: 'LEAD', position: nextPos, city: null, state: null, priceTarget: null, nextAction: c.status === 'lead' ? 'Reply to lead' : 'Review lead', nextDue: new Date() } as any })
          await prisma.activity.create({ data: { dealId: deal.id, userId: ctx.session.user.id, orgId: ctx.orgId, kind: 'NOTE', channel: 'system', subject: 'Created from Lead', meta: { threadId, extracted: c.extracted } } })
          await prisma.notification.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, type: 'lead', title: 'New Lead added to Pipeline', body: subject || undefined, link: '/crm' } }).catch(()=>{})
        }
        // Link thread/messages -> deal/contact
        await prisma.emailThread.update({ where: { id: threadId }, data: { dealId: deal.id } }).catch(()=>{})
        await prisma.emailMessage.updateMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, threadId }, data: { dealId: deal.id, contactId: contact?.id || undefined } })

        // If email mentions meeting/time, create tentative task
        if (c.reasons?.includes('time_window')) {
          const due = new Date(); due.setHours(17, 0, 0, 0)
          await prisma.task.create({ data: { userId: ctx.session.user.id, orgId: ctx.orgId, dealId: deal.id, type: 'FOLLOW_UP', status: 'PENDING', payload: { kind: 'call_or_show', note: 'Proposed meeting time in email' }, runAt: due } })
        }
      }
      fetched++
    }

    const counts = {
      threads: await prisma.emailThread.count({ where: { userId: ctx.session.user.id, orgId: ctx.orgId } }),
      messages: await prisma.emailMessage.count({ where: { userId: ctx.session.user.id, orgId: ctx.orgId } }),
    }
    return NextResponse.json({ ok: true, synced: ids.length, fetched, upsertedThreads, upsertedMessages, queryUsed: q, counts })
  } catch (e: any) {
    console.error('[inbox sync]', e)
    return NextResponse.json({ error: 'Sync failed', detail: e?.message || String(e) }, { status: 500 })
  }
}, { action: 'inbox.sync' })


