"use client"

import { useEffect } from 'react'

export function HotwordListener({ onTrigger }: { onTrigger: () => void }) {
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SpeechRecognition) return
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript.toLowerCase().trim()
        if (transcript.includes('hey castra')) {
          onTrigger()
        }
      }
    }
    rec.onerror = () => {
      try { rec.stop() } catch {}
      setTimeout(() => { try { rec.start() } catch {} }, 2000)
    }
    try { rec.start() } catch {}
    return () => { try { rec.stop() } catch {} }
  }, [onTrigger])

  return null
}
