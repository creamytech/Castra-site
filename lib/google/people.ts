import { getPeopleForUser } from '@/lib/google/gmail'

export async function getPrimaryEmail(userId: string): Promise<string | null> {
  const people = await getPeopleForUser(userId)
  try {
    const profile = await people.people.get({ resourceName: 'people/me', personFields: 'emailAddresses' })
    const emails = profile.data.emailAddresses || []
    const primary = emails.find((e: any) => e.metadata?.primary) || emails[0]
    return (primary?.value || '').toLowerCase() || null
  } catch (e) {
    return null
  }
}


