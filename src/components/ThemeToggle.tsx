import { useEffect, useState } from 'react'

type Mode = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'fg-theme'
const ORDER: Mode[] = ['system', 'light', 'dark']
const LABEL: Record<Mode, string> = { system: '🖥️ System', light: '☀️ Light', dark: '🌙 Dark' }

function apply(mode: Mode) {
  const root = document.documentElement
  if (mode === 'system') delete root.dataset.theme
  else root.dataset.theme = mode
}

export default function ThemeToggle() {
  // Start at 'system' on both server and first client render (no mismatch),
  // then reflect the stored choice after mount.
  const [mode, setMode] = useState<Mode>('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark' || stored === 'system') setMode(stored)
    } catch {
      /* ignore */
    }
  }, [])

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
    setMode(next)
    apply(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      className="fg-btn fg-btn-ghost fixed right-3 top-3 z-50 px-3 py-2 text-xs"
      aria-label={`Theme: ${mode}. Tap to change.`}
      title="Change theme"
    >
      {LABEL[mode]}
    </button>
  )
}
