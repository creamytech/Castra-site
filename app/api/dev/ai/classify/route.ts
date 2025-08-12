import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api'
import { classifyLead } from '@/src/ai/classifyLead'
import { ruleScore, blend, decideStatus } from '@/src/ai/rules'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async ({ req }) => {
  const { subject = '', body = '', from = '' } = await req.json()
  const llm = await classifyLead({ subject, body })
  const rules = ruleScore({ subject, body, from })
  const score = blend(rules, llm.score)
  const status = decideStatus({ score, llmReason: llm.reason, subject, body })
  return NextResponse.json({ llm, rules, score, status })
}, { action: 'dev.ai.classify' })


