import { useEffect, useMemo, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { revealScoresFn } from '../../lib/game.functions'
import { TARGET, type PlayerResult } from '../../lib/game-types'
import { newId, useGame } from './GameProvider'

export default function RevealScreen() {
  const { state, dispatch } = useGame()
  const reveal = useServerFn(revealScoresFn)
  const [scores, setScores] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState(false)

  const allIds = useMemo(
    () => [...new Set(state.players.flatMap((p) => p.picks.map((m) => m.objectID)))],
    [state.players],
  )

  useEffect(() => {
    let cancelled = false
    setError(false)
    reveal({ data: { objectIDs: allIds } })
      .then((res) => !cancelled && setScores(res))
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
    }
  }, [allIds, reveal])

  if (error) {
    return (
      <section className="island-shell rise-in p-7 text-center">
        <p className="demo-alert demo-alert-danger">Couldn't fetch the scores. Try again.</p>
        <button type="button" className="demo-button mt-4" onClick={() => location.reload()}>
          Retry
        </button>
      </section>
    )
  }

  if (!scores) {
    return (
      <section className="island-shell rise-in p-10 text-center">
        <p className="island-kicker">Tallying the Tomatometer…</p>
        <p className="display-title mt-2 text-3xl text-[var(--sea-ink)]">Revealing scores</p>
      </section>
    )
  }

  // Build per-player results. A missing score (rare) counts as 0.
  const results: PlayerResult[] = state.players.map((player) => {
    const perPick = player.picks.map((m) => (m.objectID in scores ? scores[m.objectID] : null))
    const total = perPick.reduce<number>((sum, s) => sum + (s ?? 0), 0)
    return {
      player,
      scores: perPick,
      total,
      distance: Math.abs(total - TARGET),
      isWinner: false,
    }
  })

  const best = Math.min(...results.map((r) => r.distance))
  results.forEach((r) => (r.isWinner = r.distance === best))
  const ranked = [...results].sort((a, b) => a.distance - b.distance)
  const winners = ranked.filter((r) => r.isWinner)

  return (
    <section className="rise-in flex flex-col gap-5">
      <header className="island-shell p-6 text-center">
        <p className="island-kicker">Target {TARGET}</p>
        <h2 className="display-title mt-1 text-3xl text-[var(--sea-ink)]">
          {winners.length > 1 ? "It's a tie!" : `🏆 ${winners[0].player.name} wins!`}
        </h2>
        <p className="demo-muted mt-1 text-sm">
          {winners.length > 1
            ? `${winners.map((w) => w.player.name).join(' & ')} tied at ${winners[0].distance} away from ${TARGET}.`
            : `${winners[0].total} — just ${winners[0].distance} from ${TARGET}.`}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {ranked.map((r) => (
          <div
            key={r.player.id}
            className={
              'demo-panel ' +
              (r.isWinner ? 'border-[var(--lagoon-deep)] ring-1 ring-[var(--lagoon)]' : '')
            }
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="demo-section-title flex items-center gap-2">
                {r.isWinner && <span aria-hidden>🏆</span>}
                {r.player.name}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-[var(--sea-ink)]">{r.total}</div>
                <div className="demo-muted text-xs">{r.distance} from {TARGET}</div>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-1">
              {r.player.picks.map((m, i) => (
                <li
                  key={m.objectID}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate text-[var(--sea-ink)]">
                    {m.title}
                    {m.year != null && <span className="demo-muted"> ({m.year})</span>}
                  </span>
                  <span className="demo-pill shrink-0">
                    {r.scores[i] == null ? 'N/A' : `${r.scores[i]}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="demo-button flex-1"
          onClick={() => dispatch({ type: 'playAgain' })}
        >
          Play again (same players)
        </button>
        <button
          type="button"
          className="demo-button demo-button-secondary flex-1"
          onClick={() => dispatch({ type: 'newGame', ids: [newId(), newId()] })}
        >
          New game
        </button>
      </div>
    </section>
  )
}
