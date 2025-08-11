import type { gmail_v1 } from 'googleapis'
import { getAuthorizedGmail } from '@/lib/google'

export async function sendReplyFromDraft(connectionId: string, threadId: string, toEmail: string, subject: string, bodyText: string) {
  const { gmail } = await getAuthorizedGmail(connectionId)
  const raw = [
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `In-Reply-To: ${threadId}`,
    `References: ${threadId}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    '',
    bodyText
  ].join('\r\n')

  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: Buffer.from(raw).toString('base64url'), threadId } as gmail_v1.Schema$Message })
  return res.data
}


