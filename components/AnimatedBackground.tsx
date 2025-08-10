'use client'

import { useEffect, useRef } from 'react'

export default function AnimatedBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="pointer-events-none absolute -top-1/2 left-1/2 -translate-x-1/2 w-[120vw] h-[120vw] rounded-full blur-3xl opacity-30" style={{ background: 'conic-gradient(from 90deg at 50% 50%, rgba(139,92,246,0.4), rgba(6,182,212,0.3), rgba(34,197,94,0.3), rgba(249,115,22,0.3), rgba(139,92,246,0.4))', animation: 'spin 30s linear infinite' }} />
      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
