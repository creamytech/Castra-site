'use client'

import { useState, useEffect } from 'react'

interface ToastProps {
  message: string
  type: 'error' | 'success' | 'info'
  duration?: number
  onClose: () => void
}

export default function Toast({ message, type, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-600 text-white'
      case 'success':
        return 'bg-green-600 text-white'
      case 'info':
        return 'bg-blue-600 text-white'
      default:
        return 'bg-gray-600 text-white'
    }
  }

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-opacity duration-300 ${getToastStyles()}`}>
      <div className="flex items-center space-x-2">
        <span>{message}</span>
        <button
          onClick={() => {
            setIsVisible(false)
            setTimeout(onClose, 300)
          }}
          className="ml-2 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  )
}
