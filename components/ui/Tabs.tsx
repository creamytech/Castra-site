"use client"

import * as React from "react"
import { cn } from "@/lib/ui/theme"

export interface TabsProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  tabs: Array<{ value: T; label: string; counter?: number }>
  className?: string
}

export function Tabs<T extends string>({ value, onValueChange, tabs, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label="Tabs" className={cn("inline-flex items-center gap-1 bg-muted p-1 rounded-md", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onValueChange(t.value)}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm",
            value === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>{t.label}</span>
          {typeof t.counter === "number" && (
            <span className="ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[11px] text-accent-foreground">
              {t.counter}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default Tabs


