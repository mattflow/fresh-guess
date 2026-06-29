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
      <section className="fg-rise text-center">
        <p className="rounded-lg bg-[#2a1a1a] px-3 py-3 text-sm text-[#f0a3a3]">
          Couldn't fetch the scores.
        </p>
        <button type="button" className="fg-btn fg-btn-primary mt-4" onClick={() => location.reload()}>
          Retry
        </button>
      </section>
    )
  }

  if (!scores) {
    return (
      <section className="fg-rise flex min-h-[60vh] flex-col items-center justify-center text-center">
        <p className="fg-kicker">Tallying the Tomatometer…</p>
        <p className="mt-2 text-2xl font-extrabold">Revealing scores</p>
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
    <section className="fg-rise flex flex-col gap-4">
      <header className="text-center">
        <p className="fg-kicker">Target {TARGET}</p>
        <h2 className="mt-1 text-3xl font-extrabold tracking-tight">
          {winners.length > 1 ? (
            "It's a tie!"
          ) : (
            <>
              🏆 <span className="text-[var(--color-fresh)]">{winners[0].player.name}</span> wins!
            </>
          )}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {winners.length > 1
            ? `${winners.map((w) => w.player.name).join(' & ')} tied at ${winners[0].distance} from ${TARGET}.`
            : `${winners[0].total} — just ${winners[0].distance} from ${TARGET}.`}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {ranked.map((r) => (
          <div
            key={r.player.id}
            className={'fg-card p-4 ' + (r.isWinner ? 'ring-1 ring-[var(--color-fresh)]' : '')}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold">
                {r.isWinner && <span aria-hidden>🏆</span>}
                {r.player.name}
              </h3>
              <div className="text-right">
                <div className="text-2xl font-extrabold">{r.total}</div>
                <div className="text-xs text-zinc-500">{r.distance} from {TARGET}</div>
              </div>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5">
              {r.player.picks.map((m, i) => (
                <li key={m.objectID} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-zinc-300">
                    {m.title}
                    {m.year != null && <span className="text-zinc-500"> ({m.year})</span>}
                  </span>
                  <span className="fg-pill shrink-0">
                    {r.scores[i] == null ? 'N/A' : `${r.scores[i]}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="fg-btn fg-btn-primary flex-1 py-3.5"
          onClick={() => dispatch({ type: 'playAgain' })}
        >
          Play again
        </button>
        <button
          type="button"
          className="fg-btn fg-btn-ghost flex-1 py-3.5"
          onClick={() => dispatch({ type: 'newGame', ids: [newId(), newId()] })}
        >
          New game
        </button>
      </div>
    </section>
  )
}
