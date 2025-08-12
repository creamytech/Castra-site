"use client"

import { useEffect, useMemo, useState } from 'react'

export default function ReportsPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>({ leadsBySource: [], firstReply: [], stageConv: [] })
  const [range, setRange] = useState<'7d'|'30d'|'90d'>('30d')
  const [owner, setOwner] = useState<string>('me')
  const [firstReplyStats, setFirstReplyStats] = useState<{ p50: number; p90: number; p95: number } | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const p = new URLSearchParams({ range, owner })
      const days = range === '7d' ? '7' : range === '90d' ? '90' : '30'
      const [sumRes, frRes] = await Promise.all([
        fetch(`/api/reports/summary?${p.toString()}`, { cache: 'no-store' }),
        fetch(`/api/reports/first-reply?days=${days}`, { cache: 'no-store' })
      ])
      const [sumJ, frJ] = await Promise.all([sumRes.json(), frRes.json()])
      if (!(sumRes as any).ok) throw new Error(sumJ?.error || 'failed')
      setData(sumJ)
      if ((frRes as any).ok) setFirstReplyStats({ p50: frJ.p50 ?? 0, p90: frJ.p90 ?? 0, p95: frJ.p95 ?? 0 })
    } catch (e: any) {
      setError(e?.message || 'failed')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex items-center gap-2 text-sm">
          <select value={range} onChange={e=>setRange(e.target.value as any)} className="border rounded px-2 py-1 bg-background">
            <option value="7d">7d</option>
            <option value="30d">30d</option>
            <option value="90d">90d</option>
          </select>
          <select value={owner} onChange={e=>setOwner(e.target.value)} className="border rounded px-2 py-1 bg-background">
            <option value="me">My deals</option>
            <option value="team">Team</option>
          </select>
          <button onClick={load} className="btn text-sm">Refresh</button>
        </div>
      </div>
      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && <div className="text-sm text-rose-400">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded bg-card">
            <div className="font-semibold mb-2">Leads by Source (30d)</div>
            <ul className="text-sm space-y-1">
              {data.leadsBySource.map((r: any) => (
                <li key={r.source} className="flex items-center justify-between"><span>{r.source || 'unknown'}</span><span className="text-muted-foreground">{r.count}</span></li>
              ))}
              {data.leadsBySource.length === 0 && <li className="text-xs text-muted-foreground">No data</li>}
            </ul>
          </div>
          <div className="p-4 border rounded bg-card">
            <div className="font-semibold mb-2">Time to First Reply</div>
            {firstReplyStats ? (
              <ul className="text-sm space-y-1">
                <li className="flex items-center justify-between"><span>P50</span><span className="text-muted-foreground">{firstReplyStats.p50} min</span></li>
                <li className="flex items-center justify-between"><span>P90</span><span className="text-muted-foreground">{firstReplyStats.p90} min</span></li>
                <li className="flex items-center justify-between"><span>P95</span><span className="text-muted-foreground">{firstReplyStats.p95} min</span></li>
              </ul>
            ) : (
              <ul className="text-sm space-y-1">
                {data.firstReply.map((r: any) => (
                  <li key={r.bucket} className="flex items-center justify-between"><span>{r.bucket}</span><span className="text-muted-foreground">{r.p50}m / {r.p95}m</span></li>
                ))}
                {data.firstReply.length === 0 && <li className="text-xs text-muted-foreground">No data</li>}
              </ul>
            )}
          </div>
          <div className="p-4 border rounded bg-card">
            <div className="font-semibold mb-2">Stage Conversion</div>
            <ul className="text-sm space-y-1">
              {data.stageConv.map((r: any) => (
                <li key={r.stage} className="flex items-center justify-between"><span>{r.stage}</span><span className="text-muted-foreground">{r.count}</span></li>
              ))}
              {data.stageConv.length === 0 && <li className="text-xs text-muted-foreground">No data</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="p-4 border rounded bg-card">
        <div className="font-semibold mb-2">Exports</div>
        <div className="flex gap-2 text-sm">
          <a href="/api/reports/pipeline.csv" className="px-3 py-1 rounded border">Export Pipeline CSV</a>
          <form action="/api/mls/cma" method="post" target="_blank">
            <button className="px-3 py-1 rounded border">Generate Deal Sheet (CMA PDF)</button>
          </form>
        </div>
      </div>
    </div>
  )
}


