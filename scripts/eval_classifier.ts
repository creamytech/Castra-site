import fs from 'node:fs'
import path from 'node:path'
import { applyInboxRules } from '@/src/ai/classifier/rules'
import { classifyLead } from '@/src/ai/classifyLead'

type Example = { subject: string; body: string; label: 'lead' | 'no_lead' | 'potential' }

function loadExamples(file = 'data/eval/lead_examples.jsonl'): Example[] {
  const p = path.resolve(process.cwd(), file)
  if (!fs.existsSync(p)) return []
  return fs.readFileSync(p, 'utf-8').split('\n').filter(Boolean).map(line => JSON.parse(line))
}

async function run() {
  const examples = loadExamples()
  let tp = 0, fp = 0, tn = 0, fn = 0
  const perFieldAcc: Record<string, { correct: number; total: number }> = {}

  for (const ex of examples) {
    const rules = applyInboxRules({ subject: ex.subject, text: ex.body })
    let llm: any = null
    try { llm = await classifyLead({ subject: ex.subject, body: ex.body }) } catch {}
    const score = Math.round(0.55 * rules.rulesScore + 0.45 * (llm?.score ?? 0))
    const pred = (llm?.isLead ?? rules.isLead) ? 'lead' : (rules.uncertainty ? 'potential' : 'no_lead')
    if (ex.label === 'lead') { if (pred === 'lead') tp++; else fn++ }
    else if (ex.label === 'no_lead') { if (pred === 'lead') fp++; else tn++ }
    else {
      // potential treated as neutral; don't count
    }
    // simple field check
    const fields = { ...rules.extracted, ...(llm?.fields || {}) }
    for (const key of ['phone','price','address']) {
      const has = !!(fields as any)[key]
      const should = /phone/.test(ex.body) || /\$/.test(ex.body) || /St|Ave|Rd|Blvd|Dr|Ln|Ct/.test(ex.body)
      perFieldAcc[key] = perFieldAcc[key] || { correct: 0, total: 0 }
      perFieldAcc[key].total++
      if (has === should) perFieldAcc[key].correct++
    }
  }

  const precision = tp / Math.max(1, tp + fp)
  const recall = tp / Math.max(1, tp + fn)
  const f1 = (2 * precision * recall) / Math.max(1e-6, precision + recall)
  console.log(JSON.stringify({ tp, fp, tn, fn, precision, recall, f1, perFieldAcc }, null, 2))
}

run().catch(e => { console.error(e); process.exit(1) })


