"use client"

import { useRef, useState } from 'react'
import { VoiceSession } from '@/components/voice/VoiceSession'

export default function VoiceDiagnostics() {
  const [logs, setLogs] = useState<string[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const testMic = async () => {
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const src = ctx.createMediaStreamSource(mic)
      const analyser = ctx.createAnalyser()
      src.connect(analyser)
      setLogs(l => ['Mic OK', ...l])
    } catch (e: any) {
      setLogs(l => [`Mic error: ${e?.message}`, ...l])
    }
  }

  const testTTS = async () => {
    try {
      const blob = new Blob([new Uint8Array([0])])
      const url = URL.createObjectURL(blob)
      if (!audioRef.current) {
        const a = document.createElement('audio')
        a.controls = true
        document.body.appendChild(a)
        audioRef.current = a
      }
      audioRef.current.src = url
      await audioRef.current.play()
      setLogs(l => ['TTS stub played (silence)', ...l])
    } catch (e: any) {
      setLogs(l => [`TTS error: ${e?.message}`, ...l])
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Voice Diagnostics</h1>
      <div className="space-x-2">
        <button onClick={testMic} className="px-3 py-2 rounded border">Test Mic</button>
        <button onClick={testTTS} className="px-3 py-2 rounded border">Play Test TTS</button>
      </div>
      <div className="p-3 border rounded text-sm bg-card">Logs:
        <div className="mt-2 space-y-1">{logs.map((l, i) => <div key={i}>{l}</div>)}</div>
      </div>
      <div className="p-3 border rounded bg-card"><VoiceSession /></div>
    </div>
  )
}
