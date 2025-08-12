"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/ui/theme"

const items = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/dashboard/inbox", label: "Inbox", icon: "📧" },
  { href: "/crm", label: "CRM", icon: "📊" },
  { href: "/calendar", label: "Cal", icon: "📅" },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75">
      <ul className="grid grid-cols-4">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href)
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={cn(
                  "flex flex-col items-center justify-center py-2 text-xs",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span aria-hidden className="text-lg">{it.icon}</span>
                <span className="mt-0.5">{it.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


