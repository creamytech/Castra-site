import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Reorder deals within a stage. Accepts array of { id, position } and writes in a transaction
export const PATCH = withAuth(async ({ req, ctx }) => {
  try {
    const body = await req.json().catch(() => ({}))
    const { stage, updates, movingId, anchorId, insertAfter } = body as { stage?: string; updates?: Array<{ id: string; position: number }>; movingId?: string; anchorId?: string; insertAfter?: boolean }
    // Mode 1: Pairwise insert (moving before/after anchor)
    if (movingId && anchorId) {
      const moving = await prisma.deal.findFirst({ where: { id: movingId, userId: ctx.session.user.id, orgId: ctx.orgId } })
      const anchor = await prisma.deal.findFirst({ where: { id: anchorId, userId: ctx.session.user.id, orgId: ctx.orgId } })
      if (!moving || !anchor) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      if (moving.stage !== anchor.stage) return NextResponse.json({ error: 'Stage mismatch' }, { status: 400 })
      const targetStage = anchor.stage
      await prisma.$transaction(async (tx) => {
        // Fetch ordered list
        const list = await tx.deal.findMany({ where: { userId: ctx.session.user.id, orgId: ctx.orgId, stage: targetStage as any }, orderBy: { position: 'asc' } })
        // Remove moving from list
        const filtered = list.filter(d => d.id !== moving.id)
        // Find anchor index and insert
        const idx = filtered.findIndex(d => d.id === anchor.id)
        const insertIdx = insertAfter ? (idx + 1) : idx
        if (insertIdx < 0) throw new Error('Anchor not in list')
        filtered.splice(insertIdx, 0, moving)
        // Reassign positions starting at 1
        for (let i = 0; i < filtered.length; i++) {
          const d = filtered[i]
          await tx.deal.update({ where: { id: d.id }, data: { position: i + 1 } })
        }
      })
      return NextResponse.json({ success: true })
    }
    // Mode 2: Bulk updates provided
    if (!stage || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    // Ensure only deals belonging to user/org and same stage
    const ids = updates.map(u => u.id)
    const rows = await prisma.deal.findMany({ where: { id: { in: ids }, userId: ctx.session.user.id, orgId: ctx.orgId, stage: stage as any } })
    if (rows.length !== updates.length) {
      return NextResponse.json({ error: 'Some deals not found or stage mismatch' }, { status: 400 })
    }
    await prisma.$transaction(updates.map(u => prisma.deal.update({ where: { id: u.id }, data: { position: u.position } })))
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[deals reorder]', e)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}, { action: 'deals.reorder' })


