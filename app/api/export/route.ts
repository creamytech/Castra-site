import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/securePrisma'

export const dynamic = 'force-dynamic'

export const GET = withAuth(async ({ ctx }) => {
  const userId = ctx.session.user.id
  // Export minimal metadata only; bodies are in object storage
  const accounts = await prisma.mailAccount.findMany({ where: { userId }, select: { id: true, provider: true, providerUserId: true } })
  const mailboxes = await prisma.mailbox.findMany({ where: { account: { userId } }, select: { id: true, email: true, accountId: true } })
  const threads = await prisma.thread.findMany({ where: { mailbox: { account: { userId } } }, select: { id: true, providerThreadId: true, latestAt: true } })
  const messages = await prisma.secureMessage.findMany({ where: { thread: { mailbox: { account: { userId } } } }, select: { id: true, threadId: true, providerMessageId: true, historyId: true, receivedAt: true, hasAttachment: true, bodyRef: true } })
  return NextResponse.json({ accounts, mailboxes, threads, messages })
}, { action: 'export.data' })


