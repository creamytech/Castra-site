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

    const llm = await classifyLead({ subject, body, headers })
    const rules = ruleScore({ subject, body, from: fromEmail ?? '', headers })
    const score = blend(rules, llm.score)
    const status = decideStatus({ score, llmReason: llm.reason })

    const existing = await (prisma as any).lead?.findFirst?.({ where: { providerMsgId: messageId, userId: user.id } })
    let lead
    if (existing) {
      lead = await (prisma as any).lead.update({ where: { id: existing.id }, data: { subject, bodySnippet: snippet, threadId, fromEmail, fromName, source: 'gmail', attrs: llm.fields, reasons: llm.reason.split(';').slice(0, 4), score, status } })
    } else {
      lead = await (prisma as any).lead.create({ data: { userId: user.id, providerMsgId: messageId, threadId, subject, bodySnippet: snippet, fromEmail, fromName, source: 'gmail', attrs: llm.fields, reasons: llm.reason.split(';').slice(0, 4), score, status } })
    }

    if (score >= ((user as any).threshold ?? 70)) {
      await job.queue.add('notify', { leadId: lead.id }, { jobId: `notify-${lead.id}` })
    }
    if (status === 'potential') {
      const open = await (prisma as any).draft?.findFirst?.({ where: { userId: user.id, leadId: lead.id, threadId, status: { in: ['queued','snoozed'] } } })
      if (!open) {
        await job.queue.add('prepare-draft', { leadId: lead.id }, { jobId: `draft-${lead.id}` })
      }
    }
    return { score, status }
  }

  if (job.name === 'prepare-draft') {
    const { leadId } = job.data as { leadId: string }
    const lead = await (prisma as any).lead.findUnique({ where: { id: leadId }, include: { user: true } })
    if (!lead) return { ok: false }
    const composed = await (await import('../ai/composeFollowup')).composeFollowup({ subject: lead.subject ?? lead.title ?? '', snippet: lead.bodySnippet ?? lead.description ?? '', fields: (lead as any).attrs ?? {}, agent: { name: (lead.user as any)?.fullName || (lead.user as any)?.name, phone: (lead.user as any)?.phone }, styleGuide: (lead.user as any)?.styleGuide })
    await (prisma as any).draft.create({ data: { userId: lead.userId, leadId: lead.id, threadId: lead.threadId ?? '', subject: composed.subject, bodyText: composed.bodyText, followupType: composed.followupType, tone: composed.tone, callToAction: composed.callToAction, proposedTimes: composed.proposedTimes as any, meta: { model: composed.model, reasons: (lead as any).reasons, score: (lead as any).score } } })
    await (prisma as any).eventLog?.create?.({ data: { userId: lead.userId, type: 'draft_created', meta: { leadId } } })
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


