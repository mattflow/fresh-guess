import { useState } from 'react'
import { useGame } from './GameProvider'

/**
 * Mid-game "New game" escape hatch. Tapping it reveals an inline two-tap
 * confirm (no native dialog) so a game can't be abandoned by accident.
 * Confirming returns to setup with the current players/names preserved.
 */
export default function EndGameButton({ className = '' }: { className?: string }) {
  const { dispatch } = useGame()
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className={'flex flex-wrap items-center gap-2 ' + className}>
        <span className="text-xs font-semibold text-[var(--fg-muted)]">Start over?</span>
        <button
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
      ↺ New game
    </button>
  )
}
