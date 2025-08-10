import { getVoiceProfile, getStyleGuide } from '../skills/style'

export type ReplyContext = {
  userId: string
  deal: any
  interactions: any[]
  leadPreference?: any
  channel: 'email' | 'sms' | 'ig'
  intent?: 'buyer_inquiry' | 'post_showing' | 'seller_lead' | 'generic'
  goal?: string
}

export async function buildPrompt(ctx: ReplyContext) {
  const voice = await getVoiceProfile(ctx.userId)
  const guide = await getStyleGuide(ctx.userId)
  const tone = guide?.tone || voice.tone || 'friendly'
  const phrases = (guide?.phrases || []).join(', ')
  const base = `Tone: ${tone}. Include one clear ask and next step.${phrases ? ` Preferred phrases: ${phrases}.` : ''}`
  let template = ''
  switch (ctx.intent) {
    case 'buyer_inquiry':
      template = 'Ask budget and neighborhoods and share 2 time windows.'
      break
    case 'post_showing':
      template = 'Ask for feedback and propose next steps.'
      break
    case 'seller_lead':
      template = 'Share pre-listing checklist and offer CMA scheduling.'
      break
    default:
      template = 'Respond helpfully with a clear CTA.'
  }
  return {
    system: `You draft ${ctx.channel.toUpperCase()} messages for real estate agents. ${base}`,
    user: `Deal: ${JSON.stringify({ title: ctx.deal?.title, stage: ctx.deal?.stage, city: ctx.deal?.city, priceTarget: ctx.deal?.priceTarget })}. Pref: ${JSON.stringify(ctx.leadPreference || {})}. Last interactions: ${JSON.stringify(ctx.interactions?.slice(0,5) || [])}. Instruction: ${template} Goal: ${ctx.goal || ''}.`,
    signature: voice.signature || ''
  }
}
