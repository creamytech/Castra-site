"use client"
import React from 'react'

type Option = { label: string; value: string }

export function Segmented({ options, value, onChange }: { options: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-full overflow-hidden border border-border bg-card shadow-sm">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-2 text-sm transition-colors ${value === opt.value ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/40'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}


