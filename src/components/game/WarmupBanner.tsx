import { useCredentialWarmup } from './useCredentialWarmup'

/**
 * Slim, auto-hiding banner shown while the RT Algolia credentials are being
 * warmed on a cold start (the one-time Playwright scrape). The hook always
 * starts the warm-up; the banner only renders when it runs long enough to be
 * worth explaining.
 */
export default function WarmupBanner() {
  const { visible } = useCredentialWarmup()
  if (!visible) return null
  return (
    <div className="fg-warmup fg-rise" role="status" aria-live="polite">
      Setting up movie search - one-time, may take a few seconds…
    </div>
  )
}
