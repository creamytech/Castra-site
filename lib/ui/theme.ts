import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Apply theme to document root
 */
export function applyTheme(mode: 'light' | 'dark') {
  const root = document.documentElement
  
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  
  localStorage.setItem('castra-theme', mode)
}

/**
 * Get current theme from localStorage or system preference
 */
export function getInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  
  const stored = localStorage.getItem('castra-theme')
  if (stored === 'light' || stored === 'dark') return stored
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Toggle between light and dark themes
 */
export function toggleTheme() {
  const current = getInitialTheme()
  const next = current === 'light' ? 'dark' : 'light'
  
  applyTheme(next)
  return next
}
