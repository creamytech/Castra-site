'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function labelFor(segment: string): string {
  if (!segment) return ''
  const map: Record<string, string> = {
    dashboard: 'Dashboard',
    inbox: 'Inbox',
    chat: 'Chat',
    crm: 'CRM',
    calendar: 'Calendar',
    reports: 'Reports',
    marketing: 'Marketing',
    mls: 'MLS',
    documents: 'Documents',
    settings: 'Settings',
    profile: 'Profile',
    admin: 'Admin',
  }
  return map[segment] || decodeURIComponent(segment).replace(/[-_]/g, ' ')
}

export default function Breadcrumbs() {
  const pathname = usePathname() || '/'
  const parts = pathname.split('/').filter(Boolean)

  // Build cumulative hrefs
  const crumbs = parts.map((part, idx) => {
    const href = '/' + parts.slice(0, idx + 1).join('/')
    const isLast = idx === parts.length - 1
    const label = labelFor(part)
    return { href, label, isLast }
  })

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex items-center gap-1 flex-wrap">
        <li>
          <Link href="/dashboard" className="hover:underline">Home</Link>
        </li>
        {crumbs.map((c, i) => (
          <li key={i} className="flex items-center gap-1">
            <span aria-hidden>›</span>
            {c.isLast ? (
              <span className="text-foreground truncate max-w-[40vw]" title={c.label}>{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:underline" title={c.label}>{c.label}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}


