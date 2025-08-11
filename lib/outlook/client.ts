import { prisma } from '@/lib/prisma'

type OutlookAuth = { accessToken: string }

export async function getOutlookAuthForUser(userId: string): Promise<OutlookAuth> {
  const acct = await prisma.account.findFirst({ where: { userId, provider: 'azure-ad' } })
  if (!acct?.access_token) {
    throw new Error('Outlook account not connected')
  }
  return { accessToken: acct.access_token }
}

export async function graphGet<T = any>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Graph GET ${path} failed: ${res.status}`)
  return res.json() as Promise<T>
}

export async function graphPost(accessToken: string, path: string, body: any): Promise<Response> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res
}


