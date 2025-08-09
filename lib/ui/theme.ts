import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind classes with proper precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Theme configuration with CSS custom properties
 */
export const theme = {
  light: {
    // Brand colors (purple-based)
    '--brand-50': '250 245 255',
    '--brand-100': '243 232 255',
    '--brand-200': '233 213 255',
    '--brand-300': '216 180 254',
    '--brand-400': '196 181 253',
    '--brand-500': '168 85 247',
    '--brand-600': '147 51 234',
    '--brand-700': '126 34 206',
    '--brand-800': '107 33 168',
    '--brand-900': '88 28 135',
    '--brand-950': '59 7 100',
    
    // Surface colors
    '--surface-0': '0 0% 100%',
    '--surface-50': '0 0% 98%',
    '--surface-100': '0 0% 96%',
    '--surface-200': '0 0% 90%',
    '--surface-300': '0 0% 83%',
    '--surface-400': '0 0% 64%',
    '--surface-500': '0 0% 45%',
    '--surface-600': '0 0% 32%',
    '--surface-700': '0 0% 25%',
    '--surface-800': '0 0% 15%',
    '--surface-900': '0 0% 9%',
    '--surface-950': '0 0% 2%',
    
    // Border colors
    '--border': '0 0% 90%',
    '--border-muted': '0 0% 96%',
    '--border-focus': '168 85 247',
    
    // Text colors
    '--text': '0 0% 9%',
    '--text-muted': '0 0% 45%',
    '--text-inverse': '0 0% 98%',
    
    // Status colors
    '--success-50': '142 76% 36%',
    '--success-500': '142 76% 36%',
    '--success-600': '142 76% 36%',
    '--warning-50': '38 92% 50%',
    '--warning-500': '38 92% 50%',
    '--warning-600': '38 92% 50%',
    '--error-50': '0 84% 60%',
    '--error-500': '0 84% 60%',
    '--error-600': '0 84% 60%',
    
    // Border radius
    '--radius-xs': '0.125rem',
    '--radius-sm': '0.25rem',
    '--radius-md': '0.375rem',
    '--radius-lg': '0.5rem',
    '--radius-xl': '0.75rem',
    '--radius-2xl': '1rem',
    
    // Shadows
    '--shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '--shadow-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    '--shadow-inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    
    // Transitions
    '--duration-fast': '150ms',
    '--duration-normal': '200ms',
    '--duration-slow': '300ms',
    '--ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    '--ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    '--ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dark: {
    // Brand colors (purple-based)
    '--brand-50': '59 7 100',
    '--brand-100': '88 28 135',
    '--brand-200': '107 33 168',
    '--brand-300': '126 34 206',
    '--brand-400': '147 51 234',
    '--brand-500': '168 85 247',
    '--brand-600': '196 181 253',
    '--brand-700': '216 180 254',
    '--brand-800': '233 213 255',
    '--brand-900': '243 232 255',
    '--brand-950': '250 245 255',
    
    // Surface colors
    '--surface-0': '0 0% 2%',
    '--surface-50': '0 0% 9%',
    '--surface-100': '0 0% 15%',
    '--surface-200': '0 0% 25%',
    '--surface-300': '0 0% 32%',
    '--surface-400': '0 0% 45%',
    '--surface-500': '0 0% 64%',
    '--surface-600': '0 0% 83%',
    '--surface-700': '0 0% 90%',
    '--surface-800': '0 0% 96%',
    '--surface-900': '0 0% 98%',
    '--surface-950': '0 0% 100%',
    
    // Border colors
    '--border': '0 0% 25%',
    '--border-muted': '0 0% 15%',
    '--border-focus': '168 85 247',
    
    // Text colors
    '--text': '0 0% 98%',
    '--text-muted': '0 0% 64%',
    '--text-inverse': '0 0% 9%',
    
    // Status colors
    '--success-50': '142 76% 36%',
    '--success-500': '142 76% 36%',
    '--success-600': '142 76% 36%',
    '--warning-50': '38 92% 50%',
    '--warning-500': '38 92% 50%',
    '--warning-600': '38 92% 50%',
    '--error-50': '0 84% 60%',
    '--error-500': '0 84% 60%',
    '--error-600': '0 84% 60%',
    
    // Border radius (same as light)
    '--radius-xs': '0.125rem',
    '--radius-sm': '0.25rem',
    '--radius-md': '0.375rem',
    '--radius-lg': '0.5rem',
    '--radius-xl': '0.75rem',
    '--radius-2xl': '1rem',
    
    // Shadows (adjusted for dark mode)
    '--shadow-xs': '0 1px 2px 0 rgb(0 0 0 / 0.3)',
    '--shadow-sm': '0 1px 3px 0 rgb(0 0 0 / 0.4), 0 1px 2px -1px rgb(0 0 0 / 0.4)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.4)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.4), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.4), 0 8px 10px -6px rgb(0 0 0 / 0.4)',
    '--shadow-2xl': '0 25px 50px -12px rgb(0 0 0 / 0.6)',
    '--shadow-inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
    
    // Transitions (same as light)
    '--duration-fast': '150ms',
    '--duration-normal': '200ms',
    '--duration-slow': '300ms',
    '--ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
    '--ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
    '--ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const

/**
 * Apply theme to document root
 */
export function applyTheme(mode: 'light' | 'dark') {
  const root = document.documentElement
  const themeVars = theme[mode]
  
  Object.entries(themeVars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
  
  root.classList.remove('theme-light', 'theme-dark')
  root.classList.add(`theme-${mode}`)
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
  localStorage.setItem('castra-theme', next)
  
  return next
}
