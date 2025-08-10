"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { HotwordListener } from './HotwordListener'
import { VoiceSession } from './VoiceSession'
import { Mic } from 'lucide-react'
import { loadHotword } from './hotword'

export default function FloatingVoiceWidget() {
  const [open, setOpen] = useState(false)
  const [voice, setVoice] = useState('verse')
  const [hotwordStatus, setHotwordStatus] = useState<'loading'|'ready'|'failed'>('loading')
  const [hotwordError, setHotwordError] = useState<string>('')
  const stopRef = useRef<(()=>void)|null>(null)
  useEffect(() => {
    let mounted = true
    loadHotword().then(hw => {
      if (!mounted) return
      if (hw.ready) {
        stopRef.current = hw.listen(() => onTrigger())
        setHotwordStatus('ready')
      } else {
        setHotwordStatus('failed')
        setHotwordError(hw.error || 'Hotword disabled')
      }
    })
    return () => { mounted = false; try { stopRef.current?.() } catch {} }
  }, [])

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
          <div className="mb-2">
            <label className="text-xs text-muted-foreground">Voice</label>
            <select value={voice} onChange={e=>setVoice(e.target.value)} className="w-full mt-1 border rounded px-2 py-1 bg-background text-sm">
              <option value="verse">Verse (default)</option>
              <option value="alloy">Alloy</option>
              <option value="ember">Ember</option>
              <option value="sol">Sol</option>
              <option value="lumi">Lumi</option>
            </select>
          </div>
          <VoiceSession voice={voice} />
          {process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true' && (
            <div className="mt-2 text-[10px] text-muted-foreground">Hotword: {hotwordStatus}{hotwordError ? ` — ${hotwordError}` : ''}</div>
          )}
        </div>
      )}
    </div>
  )
}
