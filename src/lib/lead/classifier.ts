import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export type LeadClassification = { intent: string; score: number; summary: string }

export async function classifyEmail(subject: string, snippet: string): Promise<LeadClassification> {
  const prompt = `Classify if this email indicates a real-estate lead. Return JSON {intent:"HOT|WARM|COLD|NOT_LEAD", score:0-100, summary}. Subject: ${subject}\nText: ${snippet}`
  const res = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0 })
  const content = res.choices[0]?.message?.content || '{}'
  const m = content.match(/\{[\s\S]*\}/)
  try { return JSON.parse(m ? m[0] : content) } catch { return { intent: 'WARM', score: 50, summary: snippet.slice(0, 200) } }
}

export function rulesScore(from: string, subject: string): number {
  const text = `${from} ${subject}`.toLowerCase()
  let s = 0
  if (/buy|sell|list|rent|move|tour|showing/.test(text)) s += 30
  if (/cash|preapproved|pre-approved/.test(text)) s += 20
  if (/unsubscribe|promo|sale|offer/.test(text)) s -= 30
  return Math.max(0, Math.min(100, s))
}


