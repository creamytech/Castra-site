import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth/api'
import { buildStyleGuide } from '@/src/ai/buildStyleGuide'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json()
    const guide = await buildStyleGuide({
      fullName: body.fullName,
      adjectives: body.adjectives || [],
      do: body.do || [],
      dont: body.dont || [],
      sampleEmails: body.sampleEmails || [],
      signature: body.signature,
    })
    const user = await prisma.user.update({ where: { id: ctx.session.user.id }, data: { styleGuide: guide } })
    return NextResponse.json({ ok: true, styleGuide: guide, user })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}, { action: 'onboarding.tone' })


