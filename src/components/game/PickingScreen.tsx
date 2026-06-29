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
    <section className="fg-rise flex flex-col gap-4">
      <header>
        <p className="fg-kicker">
          {player.name}'s turn · Player {idx + 1} of {state.players.length}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
          Pick {PICKS_PER_PLAYER} movies for {TARGET}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Scores stay hidden — go with your gut. {picks.length}/{PICKS_PER_PLAYER} chosen.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: PICKS_PER_PLAYER }).map((_, slot) => {
          const m = picks[slot]
          return (
            <div
              key={slot}
              className="fg-card flex min-h-[6.5rem] flex-col items-center justify-center gap-1 p-2 text-center"
            >
              {m ? (
                <>
                  <span className="line-clamp-3 text-xs font-semibold">{m.title}</span>
                  <button
                    type="button"
                    className="fg-pill mt-1 cursor-pointer text-[#f0a3a3]"
                    onClick={() => toggle(m)}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="text-2xl text-zinc-600" aria-hidden>
                  +
                </span>
              )}
            </div>
          )
        })}
      </div>

      <MovieSearch picks={picks} onToggle={toggle} />

      <button
        type="button"
        className="fg-btn fg-btn-primary sticky bottom-4 mt-1 py-4 text-base shadow-lg shadow-black/40"
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
