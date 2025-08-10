"use client"

import { useCallback, useState } from 'react'
import { HotwordListener } from './HotwordListener'
import { VoiceSession } from './VoiceSession'
import { Mic } from 'lucide-react'

export default function FloatingVoiceWidget() {
  const [open, setOpen] = useState(false)
  const onTrigger = useCallback(() => {
    setOpen(true)
    try { navigator.vibrate?.(50) } catch {}
  }, [])

  return (
    <div>
      <HotwordListener onTrigger={onTrigger} />
      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={() => setOpen(o => !o)} className={`rounded-full p-3 shadow-lg ${open ? 'bg-primary text-primary-foreground' : 'bg-card border'}`} aria-label="Voice">
          <Mic className="w-5 h-5" />
        </button>
      </div>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-80 p-3 border rounded-lg bg-background shadow-lg">
          <div className="text-sm font-medium mb-2">Voice Assistant</div>
          <VoiceSession />
        </div>
      )}
    </div>
  )
}
