import twilio from 'twilio'

export async function sendSMS(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM
  if (!sid || !token || !from) throw new Error('Twilio not configured')
  const client = twilio(sid, token)
  const res = await client.messages.create({ from, to, body })
  return res
}

export function parseInbound(form: Record<string, string | string[] | undefined>) {
  return {
    from: String(form.From || ''),
    to: String(form.To || ''),
    body: String(form.Body || ''),
    sid: String(form.MessageSid || '')
  }
}
