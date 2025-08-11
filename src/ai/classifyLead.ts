import { z } from 'zod'
import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const LeadSchema = z.object({
  isLead: z.boolean(),
  score: z.number().min(0).max(100),
  reason: z.string(),
  fields: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    mlsId: z.string().optional(),
    price: z.string().optional(),
    bedrooms: z.string().optional(),
    baths: z.string().optional(),
    timeline: z.string().optional(),
    sourceType: z.enum(['buyer','seller','renter','vendor','unknown']).optional()
  })
})

export async function classifyLead(input: { subject: string; body: string; headers?: Record<string, string> }) {
  const system = 'You classify REAL ESTATE EMAILS. Determine if it\'s a buyer/seller/renter lead vs vendor/newsletter/other. Extract fields. Return STRICT JSON only.'
  const examples = [
    { isLead: true, score: 92, reason: 'tour request; address; budget', fields: { address: '220 SE 2nd St', price: '100,000', sourceType: 'buyer' } },
    { isLead: false, score: 5, reason: 'vendor pitch/newsletter', fields: {} }
  ]
  const prompt = `Subject: ${input.subject}\n\n${input.body}\n\nReturn JSON only. Examples:\n${examples.map((e) => JSON.stringify(e)).join('\n')}`

  const resp = await (openai as any).responses.create({
    model: 'gpt-5.1',
    reasoning: { effort: 'low' },
    input: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    temperature: 0
  })

  const text = (resp.output_text || '{}').trim()
  const parsed = LeadSchema.safeParse(JSON.parse(text))
  if (!parsed.success) {
    return { isLead: false, score: 0, reason: 'parse_error', fields: {} }
  }
  return parsed.data
}


