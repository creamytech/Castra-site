import OpenAI from 'openai'

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

export async function summarizeLead(context: any): Promise<{ summary: string; nextActions: string[] }> {
  if (!client) return { summary: 'AI not configured', nextActions: [] }
  const system = 'You summarize real estate leads concisely with 2-3 sentences and propose next best 3 actions.'
  const user = `Context: ${JSON.stringify(context).slice(0, 10000)}`
  const res = await client.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [ { role: 'system', content: system }, { role: 'user', content: user } ], temperature: 0.3, max_tokens: 220 })
  const content = res.choices[0]?.message?.content || ''
  const lines = content.split('\n').filter(Boolean)
  const summary = lines.slice(0, 3).join(' ')
  const nextActions = lines.slice(3).map(l => l.replace(/^[-*]\s*/, '')).filter(Boolean).slice(0, 3)
  return { summary, nextActions }
}
