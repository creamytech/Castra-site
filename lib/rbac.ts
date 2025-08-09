import { Session } from 'next-auth'

export function isAdmin(session: Session | null): boolean {
  if (!session?.user?.groups) {
    return false
  }
  
  return session.user.groups.includes('admin') || 
         session.user.groups.includes('Admin') ||
         session.user.groups.includes('ADMIN')
}
