import { useState } from 'react'
import { PICKS_PER_PLAYER, TARGET, type SelectedMovie } from '../../lib/game-types'
import { useGame } from './GameProvider'
import MovieSearch from './MovieSearch'
import PassDevice from './PassDevice'

export default function PickingScreen() {
  const { state, dispatch } = useGame()
  // Which player has tapped "start my turn". Resets implicitly whenever the
  // current player changes (kept in component state, never persisted).
  const [armedIndex, setArmedIndex] = useState<number | null>(null)

  const idx = state.currentPlayerIndex
  const player = state.players[idx]
  if (!player) return null

  if (armedIndex !== idx) {
    return (
      <PassDevice
        name={player.name || `Player ${idx + 1}`}
        playerNumber={idx + 1}
        totalPlayers={state.players.length}
        onReady={() => setArmedIndex(idx)}
      />
    )
  }

  const picks = player.picks
  const isFull = picks.length >= PICKS_PER_PLAYER
  const isLast = idx >= state.players.length - 1

  const toggle = (movie: SelectedMovie) => dispatch({ type: 'togglePick', movie })
  const lockIn = () => {
    dispatch({ type: 'lockIn' })
    setArmedIndex(null) // re-arm the pass gate for the next player
  }

  return (
    <section className="rise-in flex flex-col gap-5">
      <header className="island-shell p-5">
        <p className="island-kicker">
          {player.name}'s turn · Player {idx + 1} of {state.players.length}
        </p>
        <h2 className="display-title mt-1 text-2xl text-[var(--sea-ink)]">
          Pick {PICKS_PER_PLAYER} movies for {TARGET}
        </h2>
        <p className="demo-muted mt-1 text-sm">
          Scores stay hidden — go with your gut. {picks.length}/{PICKS_PER_PLAYER} chosen.
        </p>
      </header>

      <div className="demo-panel">
        <h3 className="demo-section-title">Your picks</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {Array.from({ length: PICKS_PER_PLAYER }).map((_, slot) => {
            const m = picks[slot]
            return (
              <div
                key={slot}
                className="demo-card flex min-h-[6.5rem] flex-col items-center justify-center gap-1 p-2 text-center"
              >
                {m ? (
                  <>
                    <span className="line-clamp-2 text-xs font-semibold text-[var(--sea-ink)]">
                      {m.title}
                    </span>
                    <button
                      type="button"
                      className="demo-pill demo-button-danger mt-1"
                      onClick={() => toggle(m)}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <span className="demo-muted text-2xl" aria-hidden>
                    +
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="demo-panel">
        <h3 className="demo-section-title mb-3">Search movies</h3>
        <MovieSearch picks={picks} onToggle={toggle} />
      </div>

      <button
        type="button"
        className="demo-button sticky bottom-4 py-4 text-base shadow-lg"
        disabled={!isFull}
        onClick={lockIn}
      >
        {isFull
          ? isLast
            ? 'Lock in & reveal results →'
            : 'Lock in & pass the phone →'
          : `Pick ${PICKS_PER_PLAYER - picks.length} more`}
      </button>
    </section>
  )
}
