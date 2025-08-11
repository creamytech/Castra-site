"use client"
import React from 'react'

export type Status = 'lead' | 'potential' | 'no_lead' | 'vendor' | 'newsletter' | 'follow_up'
export const STATUS_LABEL: Record<Status, string> = { lead: 'Lead', potential: 'Potential', no_lead: 'No Lead', vendor: 'Vendor', newsletter: 'Newsletter', follow_up: 'Follow‑up' }
export function scoreColor(score: number) { if (score >= 80) return 'good'; if (score >= 60) return 'warn'; return 'dim' }

type Filter = Partial<{ status: Status[]; source: string[]; minScore: number; unreadOnly: boolean; hasPhone: boolean; hasPrice: boolean }>
type OnFilter = (f: Filter) => void

export function InboxFilterBar({ value, onChange }: { value: Filter; onChange: OnFilter }) {
  const toggle = (k: keyof Filter, v: any) => {
    const next = { ...value } as any
    if (Array.isArray(next[k])) {
      const arr = new Set(next[k] as any[])
      arr.has(v) ? arr.delete(v) : arr.add(v)
      next[k] = Array.from(arr)
    } else {
      next[k] = v
    }
    onChange(next)
  }
  const statuses: Status[] = ['lead', 'potential', 'no_lead', 'vendor', 'newsletter', 'follow_up']
  return (
    <div className="toolbar" role="toolbar" aria-label="Inbox filters">
      <div className="seg" aria-label="Status filters">
        {statuses.map((s) => (
          <button key={s} className="btn" aria-pressed={value.status?.includes(s) || false} onClick={() => toggle('status', s)} title={`Filter: ${STATUS_LABEL[s]}`}>
            <span className="badge" data-status={s}>{STATUS_LABEL[s]}</span>
          </button>
        ))}
      </div>
      <div className="seg">
        <label className="btn" title="Unread only">
          <input type="checkbox" checked={!!value.unreadOnly} onChange={(e) => onChange({ ...value, unreadOnly: e.target.checked })} />&nbsp;Unread
        </label>
        <label className="btn" title="Has phone">
          <input type="checkbox" checked={!!value.hasPhone} onChange={(e) => onChange({ ...value, hasPhone: e.target.checked })} />&nbsp;Phone
        </label>
        <label className="btn" title="Has price">
          <input type="checkbox" checked={!!value.hasPrice} onChange={(e) => onChange({ ...value, hasPrice: e.target.checked })} />&nbsp;Price
        </label>
      </div>
      <div className="seg" aria-label="Score">
        <input type="range" min={0} max={100} value={value.minScore ?? 0} onChange={(e) => onChange({ ...value, minScore: Number(e.target.value) })} />
        <span className="meta">Min score: {value.minScore ?? 0}</span>
      </div>
    </div>
  )
}

export function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <span className="scoreRing" data-color={color} aria-label={`Lead score ${score}`}>
      {Math.max(0, Math.min(99, score))}
    </span>
  )
}

export type Email = { id: string; fromName?: string; fromEmail?: string; subject: string; snippet?: string; date: string; unread?: boolean; status: Status; score: number; source?: string; reasons?: string[]; extracted?: { phone?: string; price?: string; address?: string } }
type RowProps = { item: Email; selected?: boolean; onOpen: (id: string) => void; onQuick: (id: string, action: 'lead' | 'potential' | 'no_lead' | 'follow_up' | 'snooze') => void }

export function EmailRow({ item, selected, onOpen, onQuick }: RowProps) {
  return (
    <div className="row" role="button" tabIndex={0} aria-selected={selected} onClick={() => onOpen(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(item.id) }}>
      <ScoreRing score={item.score} />
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: item.unread ? 700 : 500, color: 'var(--text)' }}>{item.subject}</span>
          <span className="badge" data-status={item.status}>{STATUS_LABEL[item.status]}</span>
          {item.source && <span className="chip">{item.source}</span>}
        </div>
        <div className="preview">
          {item.snippet}
          {item.extracted?.phone && <>&nbsp;•&nbsp;📞 {item.extracted.phone}</>}
          {item.extracted?.price && <>&nbsp;•&nbsp;💵 {item.extracted.price}</>}
          {item.extracted?.address && <>&nbsp;•&nbsp;📍 {item.extracted.address}</>}
        </div>
        {!!item.reasons?.length && (
          <div className="reasons" aria-label="Why this was classified">
            {item.reasons.slice(0, 4).map((r, i) => <span className="chip" key={i}>{r}</span>)}
          </div>
        )}
      </div>
      <div className="meta">
        <time dateTime={item.date}>{new Date(item.date).toLocaleString()}</time>
        <div className="seg" onClick={(e) => e.stopPropagation()}>
          <button className="btn" title="Mark Lead (L)" onClick={() => onQuick(item.id, 'lead')}>✅</button>
          <button className="btn" title="Potential (P)" onClick={() => onQuick(item.id, 'potential')}>⚠️</button>
          <button className="btn" title="Not Lead (N)" onClick={() => onQuick(item.id, 'no_lead')}>🚫</button>
          <button className="btn" title="Follow‑up" onClick={() => onQuick(item.id, 'follow_up')}>📌</button>
          <button className="btn" title="Snooze (S)" onClick={() => onQuick(item.id, 'snooze')}>⏰</button>
        </div>
      </div>
    </div>
  )
}

export function InboxList({ items, onOpen, onQuick }: { items: Email[]; onOpen: (id: string) => void; onQuick: RowProps['onQuick'] }) {
  const [index, setIndex] = React.useState(0)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'j') setIndex((i) => Math.min(items.length - 1, i + 1))
      if (e.key === 'k') setIndex((i) => Math.max(0, i - 1))
      if (e.key === 'Enter') onOpen(items[index]?.id)
      const id = items[index]?.id
      if (!id) return
      if (e.key.toLowerCase() === 'l') onQuick(id, 'lead')
      if (e.key.toLowerCase() === 'p') onQuick(id, 'potential')
      if (e.key.toLowerCase() === 'n') onQuick(id, 'no_lead')
      if (e.key.toLowerCase() === 's') onQuick(id, 'snooze')
      if (e.key.toLowerCase() === 'a') onQuick(id, 'follow_up')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, index, onOpen, onQuick])

  return (
    <div role="list">
      {items.map((it, i) => (
        <EmailRow key={it.id} item={it} selected={i === index} onOpen={onOpen} onQuick={onQuick} />
      ))}
    </div>
  )
}


