import { createWorker } from '../lib/queue'
import { prisma } from '@/lib/prisma'
import { getGoogleOAuth } from '../lib/google/getClient'
import { google } from 'googleapis'
import { classifyLead } from '../ai/classifyLead'
import { ruleScore, blend } from '../ai/rules'

function isQuietHours(now: Date) {
  // America/New_York quiet hours 21:00-08:00
  const estOffset = -300 // simplistic; production should use tz lib
  const utc = now.getUTCHours()
  const estHour = (utc + 24 + Math.floor(estOffset / 60)) % 24
  return estHour >= 21 || estHour < 8
}

async function processGmailPush(payload: any) {
  const messageData = payload?.message?.data
  if (!messageData) return
  // Pub/Sub message contains email address; map to user
  const decoded = Buffer.from(messageData, 'base64').toString('utf-8')
  const { emailAddress, historyId } = JSON.parse(decoded)
  const user = await prisma.user.findFirst({ where: { email: emailAddress } })
  if (!user) return
  const oauth2 = await getGoogleOAuth(user.id)
  const gmail = google.gmail({ version: 'v1', auth: oauth2 })
  // Read latest messages
  const list = await gmail.users.messages.list({ userId: 'me', q: 'newer_than:2d in:inbox', maxResults: 10 })
  for (const id of (list.data.messages || []).map(m=>m.id!).filter(Boolean)) {
    const detail: any = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata', metadataHeaders: ['Subject','From','Date'] })
    const headers = Object.fromEntries((detail.data.payload?.headers || []).map((h: any)=>[h.name, h.value]))
    const from = headers['From'] || ''
    const subject = headers['Subject'] || ''
    const snippet = detail.data.snippet || ''
    const existing = await prisma.emailMessage.findFirst({ where: { id, userId: user.id } })
    if (existing) continue // idempotent
    await prisma.emailMessage.create({ data: { id, threadId: detail.data.threadId || id, userId: user.id, orgId: await getOrgId(user.id), from, to: [], cc: [], date: new Date(), snippet, internalRefs: detail.data } })
    const llm = await classifyLead({ subject, body: snippet })
    const rules = ruleScore({ subject, body: snippet, from })
    const finalScore = blend(rules, llm.score)
    const lead = await (prisma as any).lead?.create?.({ data: { userId: user.id, orgId: await getOrgId(user.id), title: subject || 'Inbound Lead', description: llm.reason, status: finalScore >= 60 ? 'qualified' : 'new', source: 'gmail', value: null, notes: JSON.stringify({ llm, rules, finalScore }) } })
    // Notify via SendGrid (optional quiet hours defer)
    if (!isQuietHours(new Date())) {
      await sendAlertEmail(user.email || '', `New Lead (${finalScore})`, `${from}\n${subject}\nScore: ${finalScore}`)
    }
  }
}

async function getOrgId(userId: string) {
  const m = await prisma.orgMember.findFirst({ where: { userId }, select: { orgId: true } })
  return m?.orgId || null
}

async function sendAlertEmail(to: string, subject: string, text: string) {
  if (!process.env.SENDGRID_API_KEY || !to) return
  await fetch('https://api.sendgrid.com/v3/mail/send', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ personalizations: [{ to: [{ email: to }] }], from: { email: process.env.SENDGRID_FROM || 'noreply@castra.ai' }, subject, content: [{ type: 'text/plain', value: text }] }) })
}

createWorker(async (job) => {
  if (job.name === 'gmailPush') {
    await processGmailPush(job.data)
  }
  return { ok: true }
})


