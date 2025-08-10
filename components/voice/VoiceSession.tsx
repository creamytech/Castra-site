"use client"

import { useEffect, useRef, useState } from 'react'

type WebrtcState = 'idle' | 'connecting' | 'connected' | 'error'

export function VoiceSession() {
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [active, setActive] = useState(false)
  const [micPermission, setMicPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown')
  const [webrtcState, setWebrtcState] = useState<WebrtcState>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [needsGesture, setNeedsGesture] = useState(false)
  const debug = typeof window !== 'undefined' && (process.env.NEXT_PUBLIC_VOICE_DEBUG === 'true' || (window as any).VOICE_DEBUG)
  const inFlightRef = useRef<boolean>(false)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    ;(navigator.mediaDevices as any)?.getUserMedia({ audio: true }).then(() => setMicPermission('granted')).catch(() => setMicPermission('denied'))
  }, [])

  async function startVoice() {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setErrorMsg('')
    setNeedsGesture(false)
    setWebrtcState('connecting')

    try {
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error('Must use HTTPS for microphone and WebRTC')
      }

      const mic = await navigator.mediaDevices.getUserMedia({ audio: true }).catch((e) => { setMicPermission('denied'); throw e })
      setMicPermission('granted')

      const sessRes = await fetch('/api/voice/session', { method: 'POST' })
      const sessJson = await sessRes.json()
      if (!sessRes.ok) throw new Error(sessJson?.error || 'Failed to start voice session')

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          // Add TURN here if needed with credentials
        ],
      })
      pcRef.current = pc

      mic.getTracks().forEach((t) => pc.addTrack(t, mic))

      pc.oniceconnectionstatechange = () => {
        if (debug) console.log('ICE state', pc.iceConnectionState)
      }

      pc.ontrack = (e) => {
        if (!audioRef.current) {
          const audioEl = document.createElement('audio')
          audioEl.autoplay = true
          audioRef.current = audioEl
          document.body.appendChild(audioEl)
        }
        audioRef.current!.srcObject = e.streams[0]
        audioRef.current!.addEventListener('play', () => setWebrtcState('connected'), { once: true })
        audioRef.current!.play().catch(() => setNeedsGesture(true))
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const proxyRes = await fetch('/api/voice/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdpEndpoint: sessJson.sdpEndpoint, offerSdp: offer.sdp }),
      })
      const contentType = proxyRes.headers.get('content-type') || ''
      if (!proxyRes.ok || !contentType.includes('application/sdp')) {
        const text = await proxyRes.text()
        throw new Error(`SDP exchange failed (${proxyRes.status}): ${text}`)
      }
      const sdpText = await proxyRes.text()

      const answer: RTCSessionDescriptionInit = { type: 'answer', sdp: sdpText || '' }
      await pc.setRemoteDescription(answer)

      setActive(true)
      setWebrtcState('connected')
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unknown error')
      setWebrtcState('error')
    } finally {
      inFlightRef.current = false
    }
  }

  function stopVoice() {
    try { pcRef.current?.getSenders().forEach((s) => s.track?.stop()) } catch {}
    try { pcRef.current?.close() } catch {}
    pcRef.current = null
    setActive(false)
    setWebrtcState('idle')
    setNeedsGesture(false)
    setErrorMsg('')
  }

  return (
    <div className="space-y-2">
      {!active ? (
        <button onClick={startVoice} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm">Start Voice</button>
      ) : (
        <button onClick={stopVoice} className="px-3 py-2 rounded bg-destructive text-destructive-foreground text-sm">Stop</button>
      )}
      {micPermission === 'denied' && (
        <div className="text-xs text-red-500">Microphone access is blocked. Enable mic in your browser settings and try again.</div>
      )}
      {needsGesture && (
        <button onClick={() => { try { audioRef.current?.play(); setNeedsGesture(false) } catch {} }} className="text-xs underline">Tap to unmute</button>
      )}
      {errorMsg && (
        <div className="text-xs text-red-500">{errorMsg}</div>
      )}
      {debug && (
        <div className="text-[10px] p-2 border rounded bg-card">WebRTC: {webrtcState}</div>
      )}
    </div>
  )
}
