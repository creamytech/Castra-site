export type Draft = { channel: 'email' | 'sms'; subject?: string; text?: string; html?: string }

export function buildDraft({ action, context, tone = 'friendly' }: { action: any; context: any; tone?: string }): Draft {
  const stylePrefix = tone === 'formal' ? '' : ''
  if (action.kind === 'EMAIL_SEND') {
    const subject = action.payload.subject || 'Quick follow-up'
    const body = action.payload.body || 'Just following up to keep things moving.'
    return { channel: 'email', subject, text: `${stylePrefix}${body}` }
  }
  if (action.kind === 'SMS_SEND') {
    const text = action.payload.text || 'Hi there — quick update for you.'
    return { channel: 'sms', text }
  }
  if (action.kind === 'EVENT_CREATE') {
    const text = 'Proposed a time for our showing. Does that work?'
    return { channel: 'sms', text }
  }
  return { channel: 'sms', text: 'On it.' }
}


