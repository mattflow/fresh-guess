import { useEffect, useRef, useState } from 'react'
import { useGame } from './GameProvider'

/**
 * Mid-game escape hatch. Tapping it reveals an inline two-tap confirm (no native
 * dialog) so a game can't be abandoned by accident. Confirming returns to setup
 * with the current players/names preserved.
 *
 * Labelled "Start over" (not "New game") to stay distinct from the reveal
 * screen's "New game", which blanks the players.
 */
export default function EndGameButton({ className = '' }: { className?: string }) {
  const { dispatch } = useGame()
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Move focus to the safe (Cancel) button when the confirm appears, so keyboard
  // and screen-reader users land on the non-destructive default rather than <body>.
  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])

  if (confirming) {
    return (
      <div
        role="group"
        aria-label="Confirm starting a new game"
        className={'flex flex-wrap items-center gap-2 ' + className}
      >
        <span className="text-xs font-semibold text-[var(--fg-muted)]">End this game?</span>
        <button
          ref={cancelRef}
          type="button"
          className="fg-btn-sm fg-btn-ghost"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="fg-btn-sm fg-btn-danger"
          onClick={() => dispatch({ type: 'restartSetup' })}
        >
          Start over
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={'fg-btn-sm fg-btn-ghost ' + className}
      onClick={() => setConfirming(true)}
    >
      ↺ Start over
    </button>
  )
}
