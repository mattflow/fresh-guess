import { useEffect, useState } from 'react'
import { PICKS_PER_PLAYER, TARGET, type SelectedMovie } from '../../lib/game-types'
import EndGameButton from './EndGameButton'
import { useGame } from './GameProvider'
import PassDevice from './PassDevice'
import PicksStrip from './PicksStrip'
import SearchResults from './SearchResults'
import { useKeyboardViewport } from './useKeyboardViewport'
import { useMovieSearch } from './useMovieSearch'
import { useScores } from './useScores'

export default function PickingScreen() {
  const { state, dispatch } = useGame()
  // Which player has tapped "start my turn". Resets implicitly whenever the
  // current player changes (kept in component state, never persisted).
  const [armedIndex, setArmedIndex] = useState<number | null>(null)
  const [peeking, setPeeking] = useState(false)
  const { scores, ensure } = useScores()
  const { query, setQuery, results, status } = useMovieSearch({ peeking, ensureScores: ensure })
  // Keep the fixed layout sized to the area above the on-screen keyboard (iOS Safari).
  useKeyboardViewport()

  const isSolo = state.players.length === 1
  const idx = state.currentPlayerIndex
  const player = state.players[idx]
  const picks = player?.picks ?? []

  // While peeking, keep the current picks' scores loaded.
  useEffect(() => {
    if (peeking && picks.length) ensure(picks.map((p) => p.objectID))
  }, [peeking, picks, ensure])

  if (!player) return null

  // Solo play needs no hand-off; multiplayer shows a "pass the phone" gate so
  // the next player can't see the previous picks.
  if (!isSolo && armedIndex !== idx) {
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
    <section
      className="fixed inset-x-0 top-0 mx-auto flex w-full max-w-md flex-col overflow-hidden"
      style={{
        height: 'var(--app-vh, 100dvh)',
        transform: 'translateY(var(--app-vtop, 0px))',
      }}
    >
      {/* ===== Top chrome — pinned, never scrolls ===== */}
      <header className="flex-none space-y-3 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="truncate text-base font-extrabold tracking-tight">
            Pick {PICKS_PER_PLAYER} for {TARGET}
            <span className="ml-1 font-semibold text-[var(--fg-muted)] tabular-nums">
              · {picks.length}/{PICKS_PER_PLAYER}
            </span>
          </h2>
          <span className="shrink-0 truncate text-xs text-[var(--fg-muted)]">
            {isSolo ? 'Solo round' : player.name || `Player ${idx + 1}`}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className={'fg-btn-sm ' + (peeking ? 'fg-btn-primary' : 'fg-btn-ghost')}
            onClick={() => setPeeking((v) => !v)}
            aria-pressed={peeking}
          >
            {peeking ? '🙈 Hide scores' : '👀 Peek scores'}
          </button>
          <div className="flex flex-wrap items-center justify-end gap-3">
            {peeking && picks.length > 0 && (
              <div className="text-lg font-extrabold tabular-nums">
                {allKnown ? total : `${total}…`}
                <span className="text-xs font-semibold text-[var(--fg-muted)]"> / {TARGET}</span>
              </div>
            )}
            <EndGameButton />
          </div>
        </div>

        <PicksStrip picks={picks} peeking={peeking} scores={scores} onRemove={toggle} />

        <input
          className="fg-input"
          type="search"
          placeholder="Search a movie title…"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
      </header>

      {/* ===== Results — the only scroll region ===== */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
        <SearchResults
          results={results}
          status={status}
          query={query}
          picks={picks}
          onToggle={toggle}
          peeking={peeking}
          scores={scores}
          // Keep the search input focused (keyboard open) across picks.
          onResultPointerDown={(e) => e.preventDefault()}
        />
      </div>

      {/* ===== Lock in — pinned above the keyboard / home indicator ===== */}
      <div className="flex-none border-t border-[var(--fg-card-border)] px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          className="fg-btn fg-btn-primary w-full py-4 text-base shadow-lg shadow-black/40"
          disabled={!isFull}
          onClick={lockIn}
        >
          {isFull
            ? isSolo
              ? 'Reveal my score →'
              : isLast
                ? 'Lock in & reveal results →'
                : 'Lock in & pass the phone →'
            : `Pick ${PICKS_PER_PLAYER - picks.length} more`}
        </button>
      </div>
    </section>
  )
}
