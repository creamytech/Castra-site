import 'dotenv/config'
import { createGmailWorker } from '../lib/queue'
import { prisma } from '@/lib/prisma'
import { classifyLead } from '../ai/classifyLead'
import { ruleScore, blend, decideStatus } from '../ai/rules'
import { sendLeadEmail } from '../lib/notify'
import { normalizeMessage, listHistorySince, saveHistoryCursor } from '../lib/gmail-helpers'
import { metricIncr } from '@/lib/cache'
import { getAuthorizedGmail } from '@/lib/google'

type FetchJob = { connectionId: string }
type IngestJob = { connectionId: string; messageId: string }
type ClassifyJob = { connectionId: string; messageId: string; normalized: any }
type IngestBatchJob = { connectionId: string; messageIds: string[] }

createGmailWorker(async (job) => {
  if (job.name === 'fetch-updates') {
    const { connectionId } = job.data as FetchJob
    const { gmail, connection } = await getAuthorizedGmail(connectionId)
    let messageIds: string[] = []
    let newHistoryId: string | undefined
    try {
      const out = await listHistorySince(gmail, connection)
      messageIds = out.messageIds
      newHistoryId = out.newHistoryId
    } catch (err: any) {
      // If historyId too old, reissue watch and backfill with last 7 days inbox
      if (String(err?.message || '').includes('historyId')) {
        const labels = await gmail.users.labels.list({ userId: 'me' })
        const leadsLabelId = (labels.data.labels || []).find((l:any) => (l.name || '').toLowerCase() === 'leads')?.id
        const labelIds = ['INBOX', ...(leadsLabelId ? [leadsLabelId] : [])]
        await gmail.users.watch({ userId: 'me', requestBody: { topicName: process.env.GOOGLE_PUBSUB_TOPIC!, labelIds, labelFilterAction: 'include' } })
        const list = await gmail.users.messages.list({ userId: 'me', q: 'in:inbox newer_than:7d', maxResults: 100 })
        messageIds = (list.data.messages || []).map(m => m.id!).filter(Boolean)
      } else {
        throw err
      }
    }
    if (newHistoryId) await saveHistoryCursor(connection.id, newHistoryId)
    // Coalesce: single batch job
    if (messageIds.length) {
      await job.queue.add('ingest-batch', { connectionId, messageIds }, {
        jobId: `ingest-batch-${connectionId}-${Date.now()}`,
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 1000,
        removeOnFail: 1000
      })
    }
    await metricIncr('gmail.history.events', messageIds.length)
    return { found: messageIds.length }
  }

  if (job.name === 'ingest-message') {
    const { connectionId, messageId } = job.data as IngestJob
    const { gmail, connection, user } = await getAuthorizedGmail(connectionId)
    const normalized = await normalizeMessage(gmail, messageId)
    // Thread-level dedupe: skip if older than lastInternalDate or locked
    const threadId = normalized.threadId || messageId
    const thread = await (prisma as any).emailThread.findUnique?.({ where: { id: threadId } })
    const currentInternalDate = Number((await gmail.users.messages.get({ userId: 'me', id: messageId, fields: 'internalDate' as any })).data.internalDate || '0')
    if (thread?.lastSyncedAt && currentInternalDate && new Date(currentInternalDate).getTime() <= new Date(thread.lastSyncedAt).getTime()) {
      return { skipped: 'stale' }
    }
    // Persist minimal EmailThread/EmailMessage for traceability (idempotent upserts)
    try {
      await (prisma as any).emailThread.upsert({
        where: { id: normalized.threadId || messageId },
        update: { lastSyncedAt: new Date(), subject: normalized.subject || null },
        create: { id: normalized.threadId || messageId, userId: user.id, subject: normalized.subject || null },
      })
      await (prisma as any).emailMessage.upsert({
        where: { id: messageId },
        update: { snippet: normalized.snippet || null, bodyText: normalized.body || null },
        create: {
          id: messageId,
          threadId: normalized.threadId || messageId,
          userId: user.id,
          from: normalized.fromEmail || '',
          to: [], cc: [],
          date: new Date(),
          snippet: normalized.snippet || null,
          bodyText: normalized.body || null,
        },
      })
    } catch {}
    await job.queue.add('classify-lead', { connectionId, messageId, normalized }, {
      jobId: `classify-${connectionId}-${messageId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 1000,
      removeOnFail: 1000
    })
    await metricIncr('gmail.messages.normalized', 1)
    return { ok: true }
  }

  if (job.name === 'ingest-batch') {
    const { connectionId, messageIds } = job.data as IngestBatchJob
    const { gmail, user } = await getAuthorizedGmail(connectionId)
    let processed = 0
    for (const messageId of messageIds) {
      try {
        const normalized = await normalizeMessage(gmail, messageId)
        const threadId = normalized.threadId || messageId
        const thread = await (prisma as any).emailThread.findUnique?.({ where: { id: threadId } })
        const internalDateMs = normalized.internalDateMs || 0
        if (thread?.lastSyncedAt && internalDateMs && new Date(internalDateMs).getTime() <= new Date(thread.lastSyncedAt).getTime()) {
          continue
        }
        await (prisma as any).emailThread.upsert({
          where: { id: threadId },
          update: { lastSyncedAt: new Date(), subject: normalized.subject || null },
          create: { id: threadId, userId: user.id, subject: normalized.subject || null },
        })
        await (prisma as any).emailMessage.upsert({
          where: { id: messageId },
          update: { snippet: normalized.snippet || null, bodyText: normalized.body || null },
          create: { id: messageId, threadId, userId: user.id, from: normalized.fromEmail || '', to: [], cc: [], date: new Date(internalDateMs || Date.now()), snippet: normalized.snippet || null, bodyText: normalized.body || null },
        })
        processed++
      } catch (e) {
        console.warn('[ingest-batch] error for', messageId)
      }
    }
    return { processed }
  }

  if (job.name === 'classify-lead') {
    const { connectionId, messageId, normalized } = job.data as ClassifyJob
    const { connection, user } = await getAuthorizedGmail(connectionId)
    const { subject, body, headers, threadId, fromEmail, fromName, snippet } = normalized
    const { extractEntities } = await import('../ai/entities')

    const llm = await classifyLead({ subject, body, headers })
    const rules = ruleScore({ subject, body, from: fromEmail ?? '', headers })
    const score = blend(rules, llm.score)
    const status = decideStatus({ score, llmReason: llm.reason, subject, body })

    // Per-user allow/deny lists
    const prefs = (user as any)?.preferences || {}
    const denyDomains: string[] = prefs.denyDomains || []
    const allowDomains: string[] = prefs.allowDomains || []
    const domain = (fromEmail || '').split('@')[1] || ''
    if (denyDomains.includes(domain)) {
      await (prisma as any).lead.upsert({ where: { providerMsgId: messageId, userId: user.id } as any, update: { status: 'no_lead' }, create: { userId: user.id, providerMsgId: messageId, threadId, subject, bodySnippet: snippet, fromEmail, fromName, source: 'gmail', attrs: llm.fields, reasons: ['deny_list'], score: 0, status: 'no_lead' } })
      return { filtered: true }
    }
    if (allowDomains.includes(domain) && score < 80) {
      // boost
      (llm as any).reason += '; allow_list'
    }

    const existing = await (prisma as any).lead?.findFirst?.({ where: { providerMsgId: messageId, userId: user.id } })
    let lead
    if (existing) {
      if (existing.isLocked) {
        // Respect override lock: only update attrs/reasons/score, keep status
        lead = await (prisma as any).lead.update({ where: { id: existing.id }, data: { subject, bodySnippet: snippet, threadId, fromEmail, fromName, attrs: { ...(llm.fields||{}), extracted: extractEntities(subject||'', body||'') }, reasons: llm.reason.split(';').slice(0, 3), score } })
      } else {
        lead = await (prisma as any).lead.update({ where: { id: existing.id }, data: { subject, bodySnippet: snippet, threadId, fromEmail, fromName, source: 'gmail', attrs: { ...(llm.fields||{}), extracted: extractEntities(subject||'', body||'') }, reasons: llm.reason.split(';').slice(0, 3), score, status } })
      }
    } else {
      lead = await (prisma as any).lead.create({ data: { userId: user.id, providerMsgId: messageId, threadId, subject, bodySnippet: snippet, fromEmail, fromName, source: 'gmail', attrs: { ...(llm.fields||{}), extracted: extractEntities(subject||'', body||'') }, reasons: llm.reason.split(';').slice(0, 3), score, status } })
      // Auto-create Contact + Deal in pipeline when a new lead qualifies
      try {
        if (status === 'lead' || score >= ((user as any).threshold ?? 70)) {
          // Create contact if not exists by email
          let contact = await (prisma as any).contact.findFirst({ where: { userId: user.id, email: fromEmail || undefined } })
          if (!contact) {
            const first = (fromName || '').split(' ')[0] || 'Lead'
            const last = (fromName || '').split(' ').slice(1).join(' ') || ''
            contact = await (prisma as any).contact.create({ data: { userId: user.id, firstName: first, lastName: last, email: fromEmail || undefined } })
          }
          await (prisma as any).deal.create({ data: { userId: user.id, title: subject || 'New Lead', stage: 'LEAD', type: 'BUYER', contactId: contact.id, leadId: lead.id, priceTarget: (llm.fields as any)?.price ? Number(String((llm.fields as any).price).replace(/[^0-9]/g,'')) : null } })
        }
      } catch {}
    }

    if (score >= ((user as any).threshold ?? 70)) {
      await job.queue.add('notify', { leadId: lead.id }, { jobId: `notify-${lead.id}` })
    }
    // Always enqueue scheduling and draft prep
    await job.queue.add('prepare-schedule', { leadId: lead.id }, { jobId: `sched-${lead.id}` })
    await job.queue.add('prepare-draft', { leadId: lead.id }, { jobId: `draft-${lead.id}` })
    return { score, status }
  }

  if (job.name === 'prepare-draft') {
    const { leadId } = job.data as { leadId: string }
    const lead = await (prisma as any).lead.findUnique({ where: { id: leadId }, include: { user: true } })
    if (!lead) return { ok: false }
    const composed = await (await import('../ai/composeFollowup')).composeFollowup({ subject: lead.subject ?? lead.title ?? '', snippet: lead.bodySnippet ?? lead.description ?? '', fields: (lead as any).attrs ?? {}, agent: { name: (lead.user as any)?.meta?.agentName, phone: (lead.user as any)?.phone }, schedule: (lead as any).attrs?.schedule })
    const open = await (prisma as any).draft?.findFirst?.({ where: { userId: lead.userId, leadId: lead.id, threadId: lead.threadId ?? '', status: { in: ['queued','snoozed'] } } })
    if (open) {
      await prisma.draft.update({ where: { id: open.id }, data: { subject: composed.subject, bodyText: composed.bodyText, proposedTimes: composed.proposedTimes as any } })
    } else {
      // Respect quiet hours: if current hour in quiet window, create as 'snoozed' until quietEnd else 'queued'
      let status = 'queued'
      const policy = await (prisma as any).autonomyPolicy?.findFirst?.({ where: { userId: lead.userId, stage: 'LEAD' } })
      if (policy?.quietStart != null && policy.quietEnd != null) {
        const now = new Date(); const hour = now.getHours()
        const inQuiet = policy.quietStart < policy.quietEnd ? (hour >= policy.quietStart && hour < policy.quietEnd) : (hour >= policy.quietStart || hour < policy.quietEnd)
        if (inQuiet) status = 'snoozed'
      }
      await (prisma as any).draft.create({ data: { userId: lead.userId, leadId: lead.id, threadId: lead.threadId ?? '', status, subject: composed.subject, bodyText: composed.bodyText, followupType: composed.followupType, tone: composed.tone, callToAction: composed.callToAction, proposedTimes: composed.proposedTimes as any, meta: { model: composed.model, reasons: (lead as any).reasons, score: (lead as any).score, to: lead.fromEmail || undefined } } })
    }
    await (prisma as any).eventLog?.create?.({ data: { userId: lead.userId, type: 'draft_created', meta: { leadId } } })
    return { ok: true }
  }

  if (job.name === 'prepare-schedule') {
    const { leadId } = job.data as { leadId: string }
    const lead = await (prisma as any).lead.findUnique({ where: { id: leadId }, include: { user: true } })
    if (!lead) return { ok: false }
    const conn = await (prisma as any).connection.findFirst({ where: { userId: lead.userId, provider: 'google' } })
    const { getFreeBusy } = await import('../lib/google-calendar')
    const { parseAndProposeTimes } = await import('../ai/parseAndProposeTimes')
    const timeMin = new Date().toISOString(); const timeMax = new Date(Date.now()+3*24*3600*1000).toISOString()
    const busy = conn ? await getFreeBusy({ connectionId: conn.id, timeMin, timeMax }) : []
    const out = await parseAndProposeTimes({ body: lead.bodySnippet || '', subject: lead.subject || '', userPrefs: { timeZone: 'America/New_York', workHours: { start: 9, end: 18 }, meetingLenMinutes: 60 }, calendarBusy: busy })
    await (prisma as any).lead.update({ where: { id: lead.id }, data: { attrs: { ...(lead as any).attrs, schedule: out } } })
    return { ok: true }
  }

  if (job.name === 'refresh-thread') {
    const { leadId } = job.data as { leadId: string }
    await job.queue.add('prepare-schedule', { leadId })
    await job.queue.add('prepare-draft', { leadId })
    return { ok: true }
  }

  if (job.name === 'notify') {
    const { leadId } = job.data as { leadId: string }
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { user: true } })
    if (!lead || !lead.user) return
    await sendLeadEmail({ to: lead.user.email as string, lead })
    try {
      await prisma.notification.create({ data: { userId: lead.userId, type: 'lead', title: 'New Lead', body: lead.subject || lead.title || '', link: `/dashboard/inbox` } })
    } catch {}
    if ((prisma as any).eventLog?.create) {
      await (prisma as any).eventLog.create({ data: { userId: lead.userId, type: 'notify', meta: { leadId } } })
    }
    return { sent: true }
  }

  if (job.name === 'send-draft') {
    const { draftId } = job.data as { draftId: string }
    const draft = await prisma.draft.findUnique({ where: { id: draftId }, include: { lead: true, user: true } })
    if (!draft) return { ok: false }
    const to = (draft.lead as any)?.fromEmail || ''
    const conn = await (prisma as any).connection?.findFirst?.({ where: { userId: draft.userId, provider: 'google' } })
    if (!conn?.id) return { ok: false }
    const { sendReplyFromDraft } = await import('../lib/gmail-send')
    await sendReplyFromDraft(conn.id, draft.threadId, to, draft.subject, draft.bodyText)
    await prisma.draft.update({ where: { id: draftId }, data: { status: 'sent' } })
    await prisma.lead.update({ where: { id: draft.leadId }, data: { status: 'follow_up' } })
    await (prisma as any).eventLog?.create?.({ data: { userId: draft.userId, type: 'draft_sent', meta: { draftId } } })
    return { sent: true }
  }
})


