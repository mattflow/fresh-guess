import { useEffect, useState } from 'react'
import { PICKS_PER_PLAYER, TARGET, type SelectedMovie } from '../../lib/game-types'
import { useGame } from './GameProvider'
import MovieSearch, { ScoreBadge } from './MovieSearch'
import PassDevice from './PassDevice'
import { useScores } from './useScores'

export default function PickingScreen() {
  const { state, dispatch } = useGame()
  // Which player has tapped "start my turn". Resets implicitly whenever the
  // current player changes (kept in component state, never persisted).
  const [armedIndex, setArmedIndex] = useState<number | null>(null)
  const [peeking, setPeeking] = useState(false)
  const { scores, ensure } = useScores()

  const idx = state.currentPlayerIndex
  const player = state.players[idx]
  const picks = player?.picks ?? []

  // While peeking, keep the current picks' scores loaded.
  useEffect(() => {
    if (peeking && picks.length) ensure(picks.map((p) => p.objectID))
  }, [peeking, picks, ensure])

  if (!player) return null

  if (armedIndex !== idx) {
    return (
      <PassDevice
        name={player.name || `Player ${idx + 1}`}
        playerNumber={idx + 1}
        totalPlayers={state.players.length}
        onReady={() => {
          setPeeking(false) // every turn starts with scores hidden
          setArmedIndex(idx)
        }}
      />
    )
  }

  const isFull = picks.length >= PICKS_PER_PLAYER
  const isLast = idx >= state.players.length - 1

  const toggle = (movie: SelectedMovie) => dispatch({ type: 'togglePick', movie })
  const lockIn = () => {
    dispatch({ type: 'lockIn' })
    setPeeking(false)
    setArmedIndex(null) // re-arm the pass gate for the next player
  }

  // Running total of picked scores (only meaningful while peeking).
  const pickScores = picks.map((p) => scores[p.objectID])
  const knownScores = pickScores.filter((s): s is number => s != null)
  const total = knownScores.reduce((a, b) => a + b, 0)
  const allKnown = picks.length > 0 && knownScores.length === picks.length

  return (
    <section className="fg-rise flex flex-col gap-4">
      <header>
        <p className="fg-kicker">
          {player.name}'s turn · Player {idx + 1} of {state.players.length}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
          Pick {PICKS_PER_PLAYER} movies for {TARGET}
        </h2>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">
          {peeking
            ? 'Peeking at scores — no shame in a little research.'
            : 'Scores stay hidden — go with your gut.'}{' '}
          {picks.length}/{PICKS_PER_PLAYER} chosen.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className={'fg-btn ' + (peeking ? 'fg-btn-primary' : 'fg-btn-ghost')}
          onClick={() => setPeeking((v) => !v)}
          aria-pressed={peeking}
        >
          {peeking ? '🙈 Hide scores' : '👀 Peek scores'}
        </button>
        {peeking && picks.length > 0 && (
          <div className="text-right">
            <div className="text-xl font-extrabold tabular-nums">
              {allKnown ? total : `${total}…`}
              <span className="text-sm font-semibold text-[var(--fg-muted)]"> / {TARGET}</span>
            </div>
            {allKnown && (
              <div className="text-xs text-[var(--fg-muted)]">
                {Math.abs(total - TARGET)} away
              </div>
            )}
          </div>
        )}
      </div>

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
                  {peeking && <ScoreBadge score={scores[m.objectID]} />}
                  <span className="line-clamp-3 text-xs font-semibold">{m.title}</span>
                  <button
                    type="button"
                    className="fg-pill mt-1 cursor-pointer text-[var(--fg-danger)]"
                    onClick={() => toggle(m)}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <span className="text-2xl text-[var(--fg-faint)]" aria-hidden>
                  +
                </span>
              )}
            </div>
          )
        })}
      </div>

      <MovieSearch
        picks={picks}
        onToggle={toggle}
        peeking={peeking}
        scores={scores}
        ensureScores={ensure}
      />

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
