"use client"
import { STATUS_LABEL, STATUS_COLORS } from "@/src/lib/status";

export function ThreadHeader({ lead, onStatusChange }: { lead: any; onStatusChange: (s:string)=>void }) {
  const scoreClass = lead.score >= 80 ? 'good' : lead.score >= 60 ? 'warn' : 'dim'
  return (
    <div className="thread-header space-y-2 p-3 border-b bg-card/80 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="status-badge text-white px-3 py-1 rounded-full" style={{ background: STATUS_COLORS[lead.status] }}>
          {STATUS_LABEL[lead.status] || lead.status}
        </span>
        <span className={`score-ring border-2 rounded-full w-7 h-7 grid place-items-center text-xs score-${scoreClass}`}>{lead.score ?? 0}</span>
        <div className="ml-auto flex items-center gap-2 text-lg">
          <button onClick={()=>onStatusChange("lead")} title="Mark Lead">✅</button>
          <button onClick={()=>onStatusChange("potential")} title="Mark Potential">⚠️</button>
          <button onClick={()=>onStatusChange("no_lead")} title="Mark Not Lead">🚫</button>
        </div>
      </div>
      <div className="reason-chips flex gap-2 flex-wrap">
        {(lead.reasons || []).map((r: string, i: number) => <span key={i} className="chip text-xs px-2 py-1 rounded border">{r}</span>)}
      </div>
    </div>
  );
}


