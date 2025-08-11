import { NextRequest } from 'next/server'

let opsCounter = 0
let reqOps: number[] = []
let cacheHits = 0
let cacheLookups = 0

export function incOps(n = 1) { opsCounter += n }
export function recordRequestOps(n: number) { reqOps.push(n); if (reqOps.length > 1000) reqOps.shift() }
export function recordCache(hit: boolean) { cacheLookups++; if (hit) cacheHits++ }

export function snapshotMetrics() {
  const sorted = [...reqOps].sort((a,b)=>a-b)
  const p = (q: number) => sorted.length ? sorted[Math.floor((sorted.length-1)*q)] : 0
  const hitRate = cacheLookups ? Math.round((cacheHits/cacheLookups)*100) : 0
  return {
    totalOps: opsCounter,
    requests: reqOps.length,
    p50: p(0.5), p95: p(0.95),
    cache: { hits: cacheHits, lookups: cacheLookups, hitRate },
  }
}

export function resetMetrics() { opsCounter = 0; reqOps = []; cacheHits = 0; cacheLookups = 0 }


