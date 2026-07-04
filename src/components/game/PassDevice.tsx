import { TARGET } from '../../lib/game-types'
import EndGameButton from './EndGameButton'

/** Hand-off gate shown before each turn so the next player can't see prior picks. */
export default function PassDevice({
  name,
  playerNumber,
  totalPlayers,
  onReady,
}: {
  name: string
  playerNumber: number
  totalPlayers: number
  onReady: () => void
}) {
  return (
    <section className="fg-rise flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="fg-kicker">
        Player {playerNumber} of {totalPlayers}
      </p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
        Pass the phone to
        <br />
        <span className="text-[var(--color-splat)]">{name}</span>
      </h2>
      <p className="mt-4 max-w-xs text-sm text-[var(--fg-muted)]">
        Pick 3 movies whose Tomatometer scores add up as close to {TARGET} as you can - without
        seeing the scores. Everyone reveals at the end.
      </p>
      <button type="button" className="fg-btn fg-btn-primary mt-7 px-8 py-4" onClick={onReady}>
        I'm {name} - start my turn
      </button>
      <EndGameButton className="mt-6 justify-center" />
    </section>
  )
}
