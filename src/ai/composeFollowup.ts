import OpenAI from 'openai'
import { z } from 'zod'

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const DraftOut = z.object({
  subject: z.string().min(3),
  bodyText: z.string().min(30),
  tone: z.enum(['concise','friendly','formal']).default('concise'),
  followupType: z.enum(['buyer','seller','renter','unknown']).default('unknown'),
  callToAction: z.string().min(5),
  proposedTimes: z.array(z.object({ start: z.string(), end: z.string() })).max(3)
})

export async function composeFollowup(input: { subject: string; snippet: string; fields: any; agent?: { name?: string; phone?: string }; schedule?: { proposedWindows?: { start: string; end: string }[] } }) {
  const sys = 'You draft follow-up emails for real-estate inquiries. Be brief, professional, action-oriented. No promises or legal advice. Only include links if explicitly present and safe in the original. Avoid echoing sensitive data. Return STRICT JSON.'
  const ctx = `Original Subject: ${input.subject}\nSnippet: ${input.snippet}\nExtracted: ${JSON.stringify(input.fields || {})}\nAgent: ${JSON.stringify(input.agent || {})}\nProposedTimes: ${JSON.stringify(input.schedule?.proposedWindows || [])}`

  const resp = await (client as any).responses.create({ model: 'gpt-5.1', input: [{ role: 'system', content: sys }, { role: 'user', content: ctx }], temperature: 0.3 })
  const text = (resp.output_text || '{}').trim()
  const parsed = DraftOut.safeParse(JSON.parse(text))
  if (!parsed.success) {
    return { subject: 'Quick follow-up on your inquiry', bodyText: 'Hi there — following up on your note. Do any of these times work for a quick call?', tone: 'concise', followupType: 'unknown', callToAction: 'Reply with a time that works.', proposedTimes: [], model: 'gpt-5.1' as const }
  }
  return { ...parsed.data, model: 'gpt-5.1' as const }
}


