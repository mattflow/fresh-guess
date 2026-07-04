import { useEffect, useState } from 'react'
import { primeCredentialsFn } from '../../lib/game.functions'

// Kick off the credential warm-up exactly once per page load. Sharing a single
// promise means React StrictMode's double-mount (dev) and any re-mount reuse the
// same server call instead of firing a second scrape. Errors are swallowed — a
// failed warm-up is harmless, the real search will retry the scrape on demand.
let warmup: Promise<void> | null = null
function warm(): Promise<void> {
  if (!warmup) warmup = primeCredentialsFn().then(() => {}, () => {})
  return warmup
}

// Only surface the banner if warm-up is still running after this delay, so a
// fast resolve (env keys set, or a warm cache) never flashes it.
const SHOW_AFTER_MS = 500

/**
 * Warms the RT Algolia credentials on mount and reports whether to show the
 * one-time "setting up movie search" banner (true only when the warm-up runs
 * long enough to be worth explaining — i.e. the cold-start Playwright scrape).
 */
export function useCredentialWarmup(): { visible: boolean } {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let done = false
    const timer = setTimeout(() => {
      if (!done) setVisible(true)
    }, SHOW_AFTER_MS)
    warm().finally(() => {
      done = true
      clearTimeout(timer)
      setVisible(false)
    })
    return () => {
      done = true
      clearTimeout(timer)
    }
  }, [])

  return { visible }
}
