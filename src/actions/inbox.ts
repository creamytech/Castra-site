'use server'

import { requireSession } from '@/lib/auth/require'
import { cacheGet, cacheSet } from '@/lib/cache'
import { listThreads, getThread, createDraft as gmailCreateDraft, sendDraft as gmailSendDraft } from '@/lib/google/gmailLayer'
import { prisma } from '@/lib/prisma'
import { incrementalSync } from '@/lib/google/gmailLayer'

export async function syncInbox() {
  const { session } = await requireSession()
  const account = await prisma.account.findFirst({ where: { userId: session.user.id, provider: 'google' } })
  if (!account) throw new Error('No Google account linked')
  if (account.gmailHistoryId) {
    const { newHistoryId } = await incrementalSync(session.user.id, account.gmailHistoryId)
    if (newHistoryId && newHistoryId !== account.gmailHistoryId) {
      await prisma.account.update({ where: { id: account.id }, data: { gmailHistoryId: String(newHistoryId) } })
    }
    return { ok: true, advanced: !!newHistoryId }
  }
  // Initial cursor: use Gmail profile historyId
  const profileRes = await fetch(`${process.env.NEXTAUTH_URL || ''}/api/gmail/profile`, { cache: 'no-store' })
  const profile = await profileRes.json().catch(()=> ({}))
  if (profile?.profile?.historyId) {
    await prisma.account.update({ where: { id: account.id }, data: { gmailHistoryId: String(profile.profile.historyId) } })
  }
  return { ok: true, initialized: true }
}

export async function searchInbox(query: string, label?: string, pageToken?: string) {
  const { session } = await requireSession()
  const key = `gmail:list:${session.user.id}:${query || ''}:${label || ''}:${pageToken || ''}`
  const cached = await cacheGet<any>(key)
  if (cached) return cached
  const data = await listThreads(session.user.id, { q: query, pageToken, labelIds: label ? [label] : undefined })
  await cacheSet(key, data, query ? 15 : 60)
  return data
}

export async function getThreadBundle(threadId: string) {
  const { session } = await requireSession()
  const key = `bundle:${session.user.id}:${threadId}`
  const cached = await cacheGet<any>(key)
  if (cached) return cached
  const thread = await getThread(session.user.id, threadId)
  const payload = { thread, lead: null, deal: null }
  await cacheSet(key, payload, 60)
  return payload
}

export async function createDraft(params: { to: string; subject: string; html: string; references?: string; inReplyTo?: string }) {
  const { session } = await requireSession()
  const draft = await gmailCreateDraft(session.user.id, params)
  return draft
}

export async function sendDraft(draftId: string) {
  const { session } = await requireSession()
  const res = await gmailSendDraft(session.user.id, draftId)
  return res
}


