import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import { filterUnsafeLinks, getStyleGuide, getAcceptedDraftSnippets } from '@/lib/personalization'
import { google } from 'googleapis'

export const dynamic = 'force-dynamic'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// GET: list suggestions for a message or recent
export const GET = withAuth(async ({ req, ctx }) => {
  try {

    const { searchParams } = new URL(req.url)
    const messageId = searchParams.get('messageId') || undefined

    const where: any = { userId: ctx.session.user.id, orgId: ctx.orgId, status: { in: ['suggested', 'drafted'] } }
    if (messageId) where.messageId = messageId

    const suggestions = await prisma.smartReply.findMany({ where, orderBy: { createdAt: 'desc' }, take: 20 })
    return NextResponse.json({ success: true, suggestions })
  } catch (e: any) {
    console.error('[smart-replies GET]', e)
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}, { action: 'smart-replies.list' })

// POST: generate suggestions for a message
export const POST = withAuth(async ({ req, ctx }) => {
  try {

    const { messageId } = await req.json().catch(() => ({}))
    if (!messageId) return NextResponse.json({ error: 'messageId is required' }, { status: 400 })

    const message = await prisma.message.findFirst({ where: { id: messageId, userId: ctx.session.user.id } })
    if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    if (!openai) return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })

    const [{ styleGuide, tone, signature }, fewshots] = await Promise.all([
      getStyleGuide(ctx.session.user.id),
      getAcceptedDraftSnippets(ctx.session.user.id, 10)
    ])

    const shotText = fewshots.slice(0, 3).map(s => `Subject: ${s.subject}\nBody:\n${s.bodyText}`).join('\n\n')
    const styleText = styleGuide ? JSON.stringify(styleGuide) : ''
    const prompt = `Email from: ${message.from}\nSubject: ${message.subject}\nSnippet: ${message.snippet}\n\nWrite a short, helpful reply for a real estate agent. Keep it under 150 words, professional and friendly.\nConstraints: No legal advice, safe links only, no promises.\n${tone ? `Tone: ${tone}\n` : ''}${signature ? `Signature: ${signature}\n` : ''}${styleText ? `StyleGuide: ${styleText}\n` : ''}${shotText ? `Few-shots:\n${shotText}\n` : ''}\nReturn only the reply body.`
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You help real estate agents draft concise, effective replies.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.4,
      max_tokens: 300
    })

    let body = completion.choices[0]?.message?.content?.trim() || 'Thanks for reaching out!'
    body = filterUnsafeLinks(body)
    const to = message.from.match(/<([^>]+)>/)?.[1] || message.from
    const subject = `Re: ${message.subject || ''}`.trim()

    const suggestion = await prisma.smartReply.create({
      data: { userId: ctx.session.user.id, orgId: ctx.orgId, messageId: message.id, subject, to, body, status: 'suggested' }
    })

    await prisma.notification.create({ data: {
      userId: ctx.session.user.id,
      orgId: ctx.orgId,
      type: 'smart-reply',
      title: 'New smart reply suggestion',
      body: subject,
      link: `/dashboard/inbox/${message.id}`
    }})

    return NextResponse.json({ success: true, suggestion })
  } catch (e: any) {
    console.error('[smart-replies POST]', e)
    return NextResponse.json({ error: 'Failed to generate suggestion' }, { status: 500 })
  }
}, { action: 'smart-replies.create' })

// PATCH: approve and send (or draft) a suggestion
export const PATCH = withAuth(async ({ req, ctx }) => {
  try {

    const { id, action } = await req.json().catch(() => ({}))
    if (!id || !action) return NextResponse.json({ error: 'id and action are required' }, { status: 400 })

    const suggestion = await prisma.smartReply.findFirst({ where: { id, userId: ctx.session.user.id, orgId: ctx.orgId }, include: { message: true } })
    if (!suggestion) return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 })

    if (action === 'dismiss') {
      await prisma.smartReply.update({ where: { id }, data: { status: 'dismissed' } })
      return NextResponse.json({ success: true })
    }

    // Send via Gmail as a reply draft then send
    const account = await prisma.account.findFirst({ where: { userId: ctx.session.user.id, provider: 'google' } })
    if (!account?.access_token) return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })

    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI)
    oauth2Client.setCredentials({ access_token: account.access_token, refresh_token: account.refresh_token })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const msg = [`To: ${suggestion.to}`, `Subject: ${suggestion.subject}`, '', suggestion.body].join('\n')
    const raw = Buffer.from(msg).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    // Create draft
    const draft = await gmail.users.drafts.create({ userId: 'me', requestBody: { message: { raw, threadId: suggestion.message.threadId || undefined } } })

    let status = 'drafted'
    if (action === 'send') {
      await gmail.users.drafts.send({ userId: 'me', requestBody: { id: draft.data.id! } })
      status = 'sent'
    }

    await prisma.smartReply.update({ where: { id }, data: { status, gmailDraftId: draft.data.id || null } })

    await prisma.notification.create({ data: {
      userId: ctx.session.user.id,
      orgId: ctx.orgId,
      type: status === 'sent' ? 'email-sent' : 'draft',
      title: status === 'sent' ? 'Email sent' : 'Draft created',
      body: suggestion.subject,
      link: `/dashboard/inbox/${suggestion.messageId}`
    }})

    return NextResponse.json({ success: true, status, draftId: draft.data.id })
  } catch (e: any) {
    console.error('[smart-replies PATCH]', e)
    return NextResponse.json({ error: 'Failed to approve suggestion' }, { status: 500 })
  }
}, { action: 'smart-replies.approve' })
