export type VoiceIntentKind =
  | 'EMAIL_SEND'
  | 'SMS_SEND'
  | 'EVENT_CREATE'
  | 'DEAL_CREATE'
  | 'DEAL_MOVE_STAGE'
  | 'INBOX_ATTACH_TO_DEAL'

export type VoiceIntent = {
  kind: VoiceIntentKind
  payload: any
  needsDisambiguation?: boolean
  candidates?: any[]
}

const stageKeywords: Record<string, string[]> = {
  LEAD: ['lead'],
  QUALIFIED: ['qualified'],
  SHOWING: ['showing', 'tour'],
  OFFER: ['offer'],
  ESCROW: ['escrow'],
  CLOSED: ['closed'],
  LOST: ['lost']
}

export async function intentRouter({ userId, transcript, context }: { userId: string; transcript: string; context?: any }): Promise<VoiceIntent> {
  const text = (transcript || '').toLowerCase()

  // Email send
  if (/\b(email|mail|send an? email|draft)\b/.test(text)) {
    return { kind: 'EMAIL_SEND', payload: { text } }
  }

  // SMS send
  if (/\b(text|sms|message)\b/.test(text)) {
    return { kind: 'SMS_SEND', payload: { text } }
  }

  // Event create
  if (/(meeting|event|calendar|showing|tour).*\b(create|schedule|book|set)\b/.test(text) || /\b(schedule|book)\b.*(meeting|event|showing|tour)/.test(text)) {
    return { kind: 'EVENT_CREATE', payload: { text } }
  }

  // Deal create
  if (/(create|new)\b.*\b(deal|lead)/.test(text)) {
    return { kind: 'DEAL_CREATE', payload: { text } }
  }

  // Deal move stage
  if (/\bmove\b.*\bdeal\b/.test(text) || /\bmove\b.*\bto\b/.test(text)) {
    for (const [stage, kws] of Object.entries(stageKeywords)) {
      if (kws.some(k => text.includes(k))) {
        return { kind: 'DEAL_MOVE_STAGE', payload: { toStage: stage, text } }
      }
    }
  }

  // Inbox attach (from thread)
  if (/attach\b.*\b(thread|email)\b.*\bdeal\b/.test(text)) {
    return { kind: 'INBOX_ATTACH_TO_DEAL', payload: { text } }
  }

  // default to email draft
  return { kind: 'EMAIL_SEND', payload: { text } }
}


