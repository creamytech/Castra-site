"use client"

import { useEffect, useState } from 'react'

export default function ConfirmShowingSheet({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (text: string) => void }) {
  const [slots, setSlots] = useState<any[]>([])

  useEffect(() => {
    if (!open) return
    fetch('/api/calendar/slots').then(r=>r.json()).then(d=>setSlots(d.slots||[])).catch(()=>setSlots([]))
  }, [open])

  if (!open) return null

  const insert = () => {
    const text = `Here are some times I can do a showing:\n${slots.map((s:any)=>`- ${new Date(s.startISO).toLocaleString()}`).join('\n')}\nDo any of these work for you?`
    onInsert(text)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-full max-w-md p-4 bg-background border rounded-lg space-y-3">
        <div className="font-semibold">Propose Times</div>
        <div className="space-y-1 text-sm max-h-60 overflow-auto">
          {slots.map((s:any,i:number)=> (
            <div key={i} className="p-2 border rounded">{new Date(s.startISO).toLocaleString()} — {new Date(s.endISO).toLocaleTimeString()}</div>
          ))}
          {slots.length===0 && <div className="text-xs text-muted-foreground">No slots found.</div>}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded border text-xs">Cancel</button>
          <button onClick={insert} className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs">Insert</button>
        </div>
      </div>
    </div>
  )
}
