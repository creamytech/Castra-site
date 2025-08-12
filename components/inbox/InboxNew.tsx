"use client"
import React from 'react'

export type Status = 'lead' | 'potential' | 'no_lead' | 'vendor' | 'newsletter' | 'follow_up'
export const STATUS_LABEL: Record<Status, string> = { lead: 'Lead', potential: 'Potential', no_lead: 'No Lead', vendor: 'Vendor', newsletter: 'Newsletter', follow_up: 'Follow‑up' }
export function scoreColor(score: number) { if (score >= 80) return 'good'; if (score >= 60) return 'warn'; return 'dim' }

type Filter = Partial<{
  status: Status[];
  source: string[];
  minScore: number;
  unreadOnly: boolean;
  hasPhone: boolean;
  hasPrice: boolean;
  hasAttachment: boolean;
  timeSensitive: boolean;
}>
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
      <div className="seg" aria-label="Quick filters">
        <button className="btn" aria-pressed={!!value.unreadOnly} onClick={() => onChange({ ...value, unreadOnly: !value.unreadOnly })} title="Unread only">
          Unread
        </button>
        <button className="btn" aria-pressed={Array.isArray(value.status) && value.status.includes('lead')} onClick={() => toggle('status', 'lead')} title="Leads">
          Leads
        </button>
        <button className="btn" aria-pressed={!!value.timeSensitive} onClick={() => onChange({ ...value, timeSensitive: !value.timeSensitive })} title="Time‑sensitive">
          ⏱️ Time‑sensitive
        </button>
        <label className="btn" title="Has attachments">
          <input type="checkbox" checked={!!value.hasAttachment} onChange={(e) => onChange({ ...value, hasAttachment: e.target.checked })} />&nbsp;Attachments
        </label>
        <label className="btn" title="Auto‑categorize new emails">
          <input type="checkbox" onChange={(e)=>{
            const enabled = e.target.checked
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('inbox:autoCategorize', enabled ? '1' : '0')
              window.dispatchEvent(new CustomEvent('inbox:auto-categorize', { detail: { enabled } }))
            }
          }} />&nbsp;Auto‑categorize
        </label>
      </div>
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
        <label className="btn" title="Has attachments">
          <input type="checkbox" checked={!!value.hasAttachment} onChange={(e) => onChange({ ...value, hasAttachment: e.target.checked })} />&nbsp;Attachments
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
  const safe = Math.max(0, Math.min(100, score))
  const [angle, setAngle] = React.useState(() => (safe / 100) * 360)
  const target = (safe / 100) * 360
  const color = safe >= 80 ? '#10b981' : safe >= 60 ? '#f59e0b' : '#9ca3af'
  const track = 'rgba(255,255,255,0.08)'
  const size = 28
  const thickness = 4
  const inner = size - thickness * 2
  React.useEffect(() => {
    let raf = 0
    const start = angle
    const delta = target - start
    const startTime = performance.now()
    const duration = 240
    const tick = (t: number) => {
      const p = Math.min(1, (t - startTime) / duration)
      const eased = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p
      setAngle(start + delta * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return (
    <span
      className="inline-grid place-items-center select-none"
      aria-label={`Lead score ${safe}`}
      title={`Score ${safe}`}
      style={{
        width: size,
        height: size,
        borderRadius: '9999px',
        background: `conic-gradient(${color} ${angle}deg, ${track} 0deg)`,
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)'
      }}
    >
      <span
        style={{
          width: inner,
          height: inner,
          borderRadius: '9999px',
          background: 'var(--background, #0b0b0c)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--foreground, #e5e7eb)',
          fontSize: 10,
          fontWeight: 700,
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)'
        }}
      >
        {safe}
      </span>
    </span>
  )
}

export type Email = { id: string; fromName?: string; fromEmail?: string; subject: string; snippet?: string; date: string; unread?: boolean; status: Status; score: number; source?: string; reasons?: string[]; extracted?: { phone?: string; price?: string; address?: string } }
type RowProps = { item: Email; selected?: boolean; onOpen: (id: string) => void; onQuick: (id: string, action: 'lead' | 'potential' | 'no_lead' | 'follow_up' | 'snooze') => void }

export function EmailRow({ item, selected, onOpen, onQuick }: RowProps) {
  return (
    <div className={`row transition-transform duration-150 ${selected ? 'ring-1 ring-primary/50' : ''} hover:scale-[1.005]`} role="button" tabIndex={0} aria-selected={selected} onClick={() => onOpen(item.id)} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(item.id) }}>
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
  const [showHelp, setShowHelp] = React.useState(false)
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
      if (e.key === '?') setShowHelp((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, index, onOpen, onQuick])

  return (
    <div role="list" className="relative">
      {items.map((it, i) => (
        <EmailRow key={it.id} item={it} selected={i === index} onOpen={onOpen} onQuick={onQuick} />
      ))}
      {showHelp && (
        <div className="absolute right-2 bottom-2 p-3 rounded border bg-card shadow-lg text-xs space-y-1">
          <div className="font-semibold">Shortcuts</div>
          <div>J/K: Navigate • Enter: Open</div>
          <div>L: Lead • P: Potential • N: Not Lead</div>
          <div>A: Follow-up • S: Snooze • ?: Toggle help</div>
        </div>
      )}
    </div>
  )
}


