"use client"
import { useState } from 'react'

export function AiDraftBox({ draft, subject, body, setSubject, setBody, onInsert, onRegenerate, onSend, onSendInvite, proposed = [], onPickTime }: {
  draft?: any;
  subject: string;
  body: string;
  setSubject: (v: string) => void;
  setBody: (v: string) => void;
  onInsert: () => void;
  onRegenerate: () => void;
  onSend: () => void;
  onSendInvite: (start: string, end: string) => void;
  proposed?: { start: string; end: string }[];
  onPickTime: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="ai-draft-box border rounded bg-card/70 backdrop-blur">
      <div className="header flex items-center justify-between p-2 bg-muted/60 cursor-pointer" onClick={()=>setOpen(o=>!o)}>
        <span>✨ Smart Reply</span>
        <button className="text-xs">{open ? "▲" : "▼"}</button>
      </div>
      {open && (
        <div className="body p-3 space-y-3">
          <div className="grid grid-cols-3 gap-2 items-center">
            <label className="text-xs text-muted-foreground">Subject</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} className="col-span-2 border rounded px-2 py-1 bg-background" />
          </div>
          <textarea value={body} onChange={e=>setBody(e.target.value)} className="w-full h-28 border rounded px-2 py-1 bg-background" placeholder="Write a reply…" />
          {draft && (
            <div className="rounded border p-2 bg-background">
              {draft.subject && <div className="font-semibold text-sm mb-1">Suggestion: {draft.subject}</div>}
              <div className="text-xs whitespace-pre-wrap">{draft.bodyText || draft.body}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={onInsert} className="px-2 py-1 border rounded text-xs">Insert</button>
                <button onClick={onRegenerate} className="px-2 py-1 border rounded text-xs">Regenerate</button>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Proposed times</div>
            <div className="flex flex-wrap gap-2">
              {proposed.map(w => (
                <button key={`${w.start}-${w.end}`} onClick={()=>onPickTime(w.start, w.end)} className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-xs transition">
                  {new Date(w.start).toLocaleString()} – {new Date(w.end).toLocaleTimeString()}
                </button>
              ))}
              {!proposed.length && <div className="text-xs text-muted-foreground">No proposals yet</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={onSend} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">Send Email</button>
            <button onClick={()=>{
              if (proposed[0]) onSendInvite(proposed[0].start, proposed[0].end)
            }} className="px-3 py-1 rounded border text-xs">Send & Invite</button>
          </div>
        </div>
      )}
    </div>
  );
}


