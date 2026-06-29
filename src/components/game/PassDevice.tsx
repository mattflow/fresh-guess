import { TARGET } from '../../lib/game-types'

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
    <section className="island-shell rise-in flex flex-col items-center p-7 text-center sm:p-10">
      <p className="island-kicker">
        Player {playerNumber} of {totalPlayers}
      </p>
      <h2 className="display-title mt-2 text-3xl text-[var(--sea-ink)] sm:text-4xl">
        Pass the phone to
        <br />
        {name}
      </h2>
      <p className="demo-muted mt-3 max-w-sm text-sm">
        Pick 3 movies whose Tomatometer scores add up as close to {TARGET} as you can — no
        peeking at the scores. Everyone's reveal happens at the end.
      </p>
      <button type="button" className="demo-button mt-6 px-8" onClick={onReady}>
        I'm {name} — start my turn
      </button>
    </section>
  )
}
