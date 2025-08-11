"use client"
export function ThreadSummaryChips({ lead }: { lead: any }) {
  const fields = (lead?.extracted || lead?.attrs || {}) as any
  return (
    <div className="summary-chips flex gap-2 flex-wrap p-2">
      {fields.address && <span className="chip">📍 {fields.address}</span>}
      {fields.price && <span className="chip">💵 {fields.price}</span>}
      {fields.sourceType && <span className="chip">📌 {fields.sourceType}</span>}
      {lead?.fromEmail && <span className="chip">✉️ {lead.fromEmail}</span>}
    </div>
  );
}


