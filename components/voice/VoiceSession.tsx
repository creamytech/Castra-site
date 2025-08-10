"use client"

import { useState, useRef } from 'react'

export function VoiceSession() {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const [active, setActive] = useState(false)

  async function startVoice() {
    const session = await fetch('/api/voice/session', { method: 'POST' }).then(r => r.json())
    const pc = new RTCPeerConnection()
    pcRef.current = pc

    // Mic → AI
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
    mic.getTracks().forEach(t => pc.addTrack(t, mic))

    // AI → Speaker
    pc.ontrack = e => {
      const audioEl = document.createElement('audio')
      audioEl.srcObject = e.streams[0]
      audioEl.autoplay = true
      document.body.appendChild(audioEl)
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const sdpResponse = await fetch(`${session.client_secret.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: offer.sdp || ''
    })
    const answer = { type: 'answer', sdp: await sdpResponse.text() } as RTCSessionDescriptionInit
    await pc.setRemoteDescription(answer)

    setActive(true)
  }

  function stopVoice() {
    pcRef.current?.close()
    setActive(false)
  }

  return (
    <div>
      {active ? (
        <button onClick={stopVoice} className="px-3 py-2 rounded bg-destructive text-destructive-foreground text-sm">End Session</button>
      ) : (
        <button onClick={startVoice} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm">Start Voice</button>
      )}
    </div>
  )
}
