"use client"
import { useState } from 'react'

export function AiDraftBox({ draft, onInsert, onEdit, onRegenerate }: { draft?: any; onInsert:()=>void; onEdit:()=>void; onRegenerate:()=>void }) {
  if (!draft) return null;
  const [open, setOpen] = useState(true);
  return (
    <div className="ai-draft-box border rounded">
      <div className="header flex items-center justify-between p-2 bg-muted cursor-pointer" onClick={()=>setOpen(o=>!o)}>
        <span>✨ AI Suggestion</span>
        <button className="text-xs">{open ? "▲" : "▼"}</button>
      </div>
      {open && (
        <div className="body p-2 space-y-2">
          {draft.subject && <strong>{draft.subject}</strong>}
          <p className="text-sm whitespace-pre-wrap">{draft.bodyText || draft.body}</p>
          <div className="actions flex gap-2">
            <button onClick={onInsert} className="px-2 py-1 border rounded text-xs">Insert</button>
            <button onClick={onEdit} className="px-2 py-1 border rounded text-xs">Edit</button>
            <button onClick={onRegenerate} className="px-2 py-1 border rounded text-xs">Regenerate</button>
          </div>
        </div>
      )}
    </div>
  );
}


