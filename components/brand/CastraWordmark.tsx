"use client"

import { motion } from "framer-motion"
import Link from "next/link"

interface CastraWordmarkProps {
  className?: string
  size?: "sm" | "md" | "lg"
  withGlow?: boolean
}

export function CastraWordmark({ className = "", size = "md", withGlow = true }: CastraWordmarkProps) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  }[size]

  return (
    <Link href="/dashboard" aria-label="Castra Home" className={`inline-flex items-center ${className}`}>
      <motion.span
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`font-extrabold tracking-tight ${sizeClasses} select-none relative`}
        style={{
          backgroundImage: "linear-gradient(90deg, #8b5cf6, #ec4899, #22c55e)",
          backgroundSize: "200% 200%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        <motion.span
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{ display: "inline-block", backgroundImage: "inherit", backgroundSize: "inherit", WebkitBackgroundClip: "text", backgroundClip: "text" }}
        >
          Castra
        </motion.span>
        {withGlow && (
          <span className="absolute -inset-0.5 blur-md opacity-20 pointer-events-none" style={{
            background: "radial-gradient(closest-side, rgba(139,92,246,0.6), rgba(236,72,153,0.5), rgba(34,197,94,0.4), transparent)"
          }} />
        )}
      </motion.span>
    </Link>
  )
}
