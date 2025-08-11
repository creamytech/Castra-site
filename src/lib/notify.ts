import sg from '@sendgrid/mail'
if (process.env.SENDGRID_API_KEY) sg.setApiKey(process.env.SENDGRID_API_KEY)

export async function sendLeadEmail({ to, lead }: { to: string; lead: any }) {
  const urlBase = process.env.APP_URL || 'https://app.castra.ai'
  const viewUrl = `${urlBase}/leads/${lead.id}`
  const markLead = `${urlBase}/api/inbox/${lead.id}/status?status=lead`
  const markNo = `${urlBase}/api/inbox/${lead.id}/status?status=no_lead`

  await sg.send({
    to,
    from: process.env.SENDGRID_FROM!,
    subject: `New lead: ${lead.fromName || lead.subject} (${lead.score})`,
    text: `Subject: ${lead.subject}
Score: ${lead.score}  Status: ${lead.status}
From: ${lead.fromName || ''} <${lead.fromEmail || ''}>
${lead.bodySnippet || ''}

Extracted: ${JSON.stringify(lead.attrs || {})}
Reasons: ${(lead.reasons || []).join(', ')}

View: ${viewUrl}
Mark Lead: ${markLead}
Not a lead: ${markNo}
`
  })
}


