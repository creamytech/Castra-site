"use client"
import { STATUS_LABEL, STATUS_COLORS } from "@/src/lib/status";

export function ThreadHeader({ lead, onStatusChange }: { lead: any; onStatusChange: (s:string)=>void }) {
  const scoreClass = lead.score >= 80 ? 'good' : lead.score >= 60 ? 'warn' : 'dim'
  // animate score sweep via inline style var --sweep
  const sweep = Math.max(0, Math.min(100, (lead.score ?? 0)))
  return (
    <div className="thread-header space-y-2 p-3 border-b bg-card/80 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="status-badge text-white px-3 py-1 rounded-full transition-transform duration-150 hover:scale-[1.03]" style={{ background: STATUS_COLORS[lead.status] }}>
          {STATUS_LABEL[lead.status] || lead.status}
        </span>
        <span className={`score-ring border-2 rounded-full w-7 h-7 grid place-items-center text-xs score-${scoreClass}`} aria-label={`Score ${lead.score ?? 0}`} style={{ ['--sweep' as any]: `${sweep}%` }}>
          {lead.score ?? 0}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={()=>onStatusChange("lead")} className="btn px-2 py-1 text-xs hover:scale-[1.02] active:scale-[0.98] transition" title="Mark Lead">Lead</button>
          <button onClick={()=>onStatusChange("potential")} className="btn px-2 py-1 text-xs hover:scale-[1.02] active:scale-[0.98] transition" title="Mark Potential">Potential</button>
          <button onClick={()=>onStatusChange("no_lead")} className="btn px-2 py-1 text-xs hover:scale-[1.02] active:scale-[0.98] transition" title="Mark Not Lead">No Lead</button>
        </div>
      </div>
      <div className="reason-chips flex gap-2 flex-wrap">
        {(lead.reasons || []).map((r: string, i: number) => <span key={i} className="chip text-xs px-2 py-1 rounded border hover:bg-accent/40 transition">{r}</span>)}
      </div>
    </div>
  );
}


