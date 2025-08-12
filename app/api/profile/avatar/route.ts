import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req, ctx }) => {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    if (file.size > 1_500_000) return NextResponse.json({ error: 'Image too large (max ~1.5MB)' }, { status: 400 })

    const arrayBuf = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuf).toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    await prisma.user.update({ where: { id: ctx.session.user.id }, data: { image: dataUrl } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update avatar' }, { status: 500 })
  }
})


