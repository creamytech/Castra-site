import 'dotenv/config'
import { createWorker } from '../lib/queue'
import { prisma } from '@/lib/prisma'
import { classifyLead } from '../ai/classifyLead'
import { ruleScore, blend, decideStatus } from '../ai/rules'
import { sendLeadEmail } from '../lib/notify'
import { normalizeMessage, listHistorySince, saveHistoryCursor } from '../lib/gmail-helpers'
import { getAuthorizedGmail } from '@/lib/google'

type FetchJob = { connectionId: string }
type IngestJob = { connectionId: string; messageId: string }
type ClassifyJob = { connectionId: string; messageId: string; normalized: any }

createWorker(async (job) => {
  if (job.name === 'fetch-updates') {
    const { connectionId } = job.data as FetchJob
    const { gmail, connection } = await getAuthorizedGmail(connectionId)
    const { messageIds, newHistoryId } = await listHistorySince(gmail, connection)
    if (newHistoryId) await saveHistoryCursor(connection.id, newHistoryId)
    for (const id of messageIds) {
      await job.queue.add('ingest-message', { connectionId, messageId: id }, { jobId: `ingest-${connectionId}-${id}` })
    }
    return { found: messageIds.length }
  }

  if (job.name === 'ingest-message') {
    const { connectionId, messageId } = job.data as IngestJob
    const { gmail, connection, user } = await getAuthorizedGmail(connectionId)
    const normalized = await normalizeMessage(gmail, messageId)
    if ((prisma as any).eventLog?.create) {
      await (prisma as any).eventLog.create({ data: { userId: user.id, type: 'ingest', meta: { messageId } } })
    }
    await job.queue.add('classify-lead', { connectionId, messageId, normalized }, { jobId: `classify-${connectionId}-${messageId}` })
    return { ok: true }
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
      lead = await (prisma as any).lead.update({ where: { id: existing.id }, data: { subject, bodySnippet: snippet, threadId, fromEmail, fromName, source: 'gmail', attrs: { ...(llm.fields||{}), extracted: extractEntities(subject||'', body||'') }, reasons: llm.reason.split(';').slice(0, 3), score, status } })
    } else {
      lead = await (prisma as any).lead.create({ data: { userId: user.id, providerMsgId: messageId, threadId, subject, bodySnippet: snippet, fromEmail, fromName, source: 'gmail', attrs: { ...(llm.fields||{}), extracted: extractEntities(subject||'', body||'') }, reasons: llm.reason.split(';').slice(0, 3), score, status } })
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
      await (prisma as any).draft.create({ data: { userId: lead.userId, leadId: lead.id, threadId: lead.threadId ?? '', subject: composed.subject, bodyText: composed.bodyText, followupType: composed.followupType, tone: composed.tone, callToAction: composed.callToAction, proposedTimes: composed.proposedTimes as any, meta: { model: composed.model, reasons: (lead as any).reasons, score: (lead as any).score } } })
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


