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
      if (/tour|showing|visit|view(ing)?/.test(text)) return 'SHOWING_REQUEST'
      if (/offer|counter|contract/.test(text)) return 'OFFER_DISCUSSION'
      if (/interested|looking|buy|rent|sell/.test(text)) return 'LEAD_INTEREST'
      if (/unsubscribe|promo|sale/.test(text)) return 'POSSIBLE_SPAM'
      return 'GENERAL'
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

      const intent = classify(subject || '', snippet || '')
      const status = intent.includes('OFFER') ? 'lead' : intent.includes('SHOWING') || intent.includes('INTEREST') ? 'potential' : intent.includes('SPAM') ? 'no_lead' : 'follow_up'
      const score = status === 'lead' ? 85 : status === 'potential' ? 70 : status === 'no_lead' ? 10 : 55
      const extracted = (() => {
        const phone = (snippet.match(/\b\+?1?\s*\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/) || [])[0]
        const price = (snippet.match(/\b(?:\$\s?)?\d{2,3}(?:,\d{3})*(?:\s?k|\s?mm|\s?million)?\b/i) || [])[0]
        const addr = (snippet.match(/\b\d+\s+[A-Za-z].+?(St|Ave|Rd|Blvd|Dr|Ln|Ct)\b/i) || [])[0]
        return { phone, price, address: addr }
      })()

      const upMsg = await prisma.emailMessage.upsert({
        where: { id: id! },
        create: {
          id: id!, threadId, userId: ctx.session.user.id, orgId: ctx.orgId, from, to, cc, date, snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null,
          internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })),
          intent,
        },
        update: { snippet, bodyHtml: bodyHtml || null, bodyText: bodyText || null, internalRefs: JSON.parse(JSON.stringify({ labelIds: data.labelIds })), intent },
      })
      if (upMsg) upsertedMessages++

      // Persist computed status/score on thread for UI badges
      await prisma.emailThread.update({ where: { id: threadId }, data: { status, score, reasons: [intent], extracted } })
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


