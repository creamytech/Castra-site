import OpenAI from 'openai'
import { prisma } from '@/lib/prisma'

export type VoiceProfile = { signature?: string; tone?: string }

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export async function getVoiceProfile(_userId: string): Promise<VoiceProfile> {
  // TODO: derive from Instagram + past emails
  return { signature: 'Best,\nBen — Castra Realty', tone: 'friendly' }
}

export async function analyzeStyle(messages: string[]) {
  if (!client) return null
  const system = 'You analyze writing style and return strict JSON.'
  const prompt = `Analyze writing style from these samples and return JSON {tone, formality, emojis, sentenceLength, phrases, description}. Samples:\n${messages.slice(0, 100).join('\n---\n').slice(0, 8000)}`
  const res = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [ { role: 'system', content: system }, { role: 'user', content: prompt } ], temperature: 0.2, max_tokens: 400 })
  const content = res.choices[0]?.message?.content || '{}'
  const jsonText = content.match(/\{[\s\S]*\}/)?.[0] || '{}'
  return JSON.parse(jsonText)
}

export async function getStyleGuide(userId: string): Promise<any | null> {
  const profile = await prisma.userProfile.findFirst({ where: { userId } })
  return profile?.styleGuide as any || null
}

export async function setStyleGuide(userId: string, guide: any) {
  const existing = await prisma.userProfile.findFirst({ where: { userId } })
  if (existing) {
    await prisma.userProfile.update({ where: { id: existing.id }, data: { styleGuide: guide } })
  } else {
    await prisma.userProfile.create({ data: { userId, styleGuide: guide } })
  }
}
