"use client"
import React from 'react'
import { STATUS_LABEL, type Status } from './InboxNew'

type Filter = Partial<{ status: Status[]; source: string[]; minScore: number; unreadOnly: boolean; hasPhone: boolean; hasPrice: boolean; sortBy: 'latest' | 'score' }>

export default function FiltersSidebar({ value, onChange }: { value: Filter; onChange: (f: Filter) => void }) {
  const toggleArray = (key: keyof Filter, v: string) => {
    const next = { ...value } as any
    const set = new Set<string>(Array.isArray(next[key]) ? (next[key] as string[]) : [])
    set.has(v) ? set.delete(v) : set.add(v)
    next[key] = Array.from(set)
    onChange(next)
  }

  const setField = (key: keyof Filter, v: any) => onChange({ ...value, [key]: v })

  const statuses: Status[] = ['lead', 'potential', 'no_lead', 'vendor', 'newsletter', 'follow_up']

  return (
    <aside className="space-y-4">
      <div className="p-3 border rounded bg-card">
        <div className="text-sm font-semibold mb-2">Filters</div>
        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-1">Sort</div>
          <div className="flex gap-2 text-xs">
            <button className={`px-2 py-1 rounded border ${value.sortBy==='latest'||!value.sortBy?'bg-primary text-primary-foreground':''}`} onClick={()=>onChange({ ...value, sortBy: 'latest' })}>Latest</button>
            <button className={`px-2 py-1 rounded border ${value.sortBy==='score'?'bg-primary text-primary-foreground':''}`} onClick={()=>onChange({ ...value, sortBy: 'score' })}>Best Score</button>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mb-2">Status</div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              className={`px-2 py-1 rounded border text-xs ${value.status?.includes(s) ? 'bg-primary text-primary-foreground' : ''}`}
              onClick={() => toggleArray('status', s)}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3 border rounded bg-card">
        <div className="text-xs text-muted-foreground mb-2">Attributes</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value.unreadOnly} onChange={(e) => setField('unreadOnly', e.target.checked)} />
          Unread only
        </label>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={!!value.hasPhone} onChange={(e) => setField('hasPhone', e.target.checked)} />
          Has phone
        </label>
        <label className="flex items-center gap-2 text-sm mt-2">
          <input type="checkbox" checked={!!value.hasPrice} onChange={(e) => setField('hasPrice', e.target.checked)} />
          Has price
        </label>
      </div>

      <div className="p-3 border rounded bg-card">
        <div className="text-xs text-muted-foreground mb-2">Min score</div>
        <input
          type="range"
          min={0}
          max={100}
          value={value.minScore ?? 0}
          onChange={(e) => setField('minScore', Number(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-muted-foreground mt-1">{value.minScore ?? 0}</div>
      </div>
    </aside>
  )
}


