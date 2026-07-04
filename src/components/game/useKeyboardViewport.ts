import { useEffect } from 'react'

/**
 * Keyboard-aware sizing for the full-screen picking layout, iOS-Safari first.
 *
 * iOS Safari ignores `interactive-widget=resizes-content`: when the on-screen
 * keyboard opens it shrinks the *visual* viewport but leaves the layout viewport
 * (and `100dvh`) at full height, so a bottom-pinned element would hide behind the
 * keyboard. The reliable cross-browser signal is the VisualViewport API, which
 * iOS Safari does support.
 *
 * We publish the visible height and the visual viewport's vertical offset as CSS
 * custom properties; the picking `<section>` is `position: fixed`, sized to
 * `var(--app-vh)` and translated down by `var(--app-vtop)` so it always fills the
 * area above the keyboard, wherever iOS scrolls the page to reveal the input.
 *
 * Client-only (runs in an effect) so it never affects SSR — the section falls
 * back to `100dvh` until this mounts, which is identical on server and client.
 */
export function useKeyboardViewport() {
  useEffect(() => {
    const root = document.documentElement
    const vv = window.visualViewport

    // Lock the page so the fixed section can't be rubber-band-scrolled away on iOS.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const apply = () => {
      if (!vv) return
      root.style.setProperty('--app-vh', `${vv.height}px`)
      root.style.setProperty('--app-vtop', `${vv.offsetTop}px`)
    }
    apply()
    vv?.addEventListener('resize', apply)
    vv?.addEventListener('scroll', apply)

    return () => {
      vv?.removeEventListener('resize', apply)
      vv?.removeEventListener('scroll', apply)
      root.style.removeProperty('--app-vh')
      root.style.removeProperty('--app-vtop')
      document.body.style.overflow = prevOverflow
    }
  }, [])
}
