'use client'

import { motion } from 'framer-motion'

export default function MarketingWordmark({ className = '' }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`font-extrabold text-5xl md:text-6xl tracking-tight ${className}`}
      style={{
        backgroundImage: 'linear-gradient(90deg, #8b5cf6, #06b6d4, #22c55e, #f97316, #8b5cf6)',
        backgroundSize: '300% 300%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent'
      }}
    >
      <motion.span
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        style={{ display: 'inline-block', backgroundImage: 'inherit', backgroundSize: 'inherit', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}
      >
        Castra
      </motion.span>
    </motion.div>
  )
}
