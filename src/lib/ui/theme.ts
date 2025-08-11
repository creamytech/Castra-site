type ThemeId = 'classic' | 'sunset' | 'ocean' | 'forest' | 'lux'

export function getInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'classic'
  return (localStorage.getItem('theme') as ThemeId) || 'classic'
}

export function applyTheme(id: ThemeId) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = id
  localStorage.setItem('theme', id)
}

export const THEMES: { id: ThemeId; name: string; preview: string }[] = [
  { id: 'classic', name: 'Classic', preview: 'linear-gradient(135deg,#6366f1,#22d3ee)' },
  { id: 'sunset', name: 'Sunset', preview: 'linear-gradient(135deg,#f97316,#ef4444)' },
  { id: 'ocean', name: 'Ocean', preview: 'linear-gradient(135deg,#0ea5e9,#22d3ee)' },
  { id: 'forest', name: 'Forest', preview: 'linear-gradient(135deg,#10b981,#065f46)' },
  { id: 'lux', name: 'Luxury', preview: 'linear-gradient(135deg,#f59e0b,#8b5cf6)' },
]


