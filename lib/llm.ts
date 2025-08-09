import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null

export interface GenerateReplyParams {
  threadSummary: string
  lastMessage: string
  agentProfile?: string
}

export async function generateReply({ threadSummary, lastMessage, agentProfile }: GenerateReplyParams): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const systemPrompt = `You are Castra, an AI-powered realtor co-pilot. Your communication style is:

- Concise and warm
- Draft-only (never send directly)
- No legal advice
- Propose 2-3 times when scheduling
- Return HTML tables when listing things
- Professional but approachable

${agentProfile ? `Agent Profile: ${agentProfile}` : ''}

Always respond in HTML format for better email presentation.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Thread Summary: ${threadSummary}\n\nLast Message: ${lastMessage}\n\nWrite a professional reply:`,
      },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || 'Unable to generate reply'
}

export async function generateChatReply(messages: any[], tools: any[], systemPrompt: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...messages,
    ],
    tools,
    tool_choice: 'auto',
    max_tokens: 1000,
    temperature: 0.7,
  })

  return completion.choices[0]?.message?.content || 'Unable to generate response'
}
