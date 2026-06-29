import { useCallback, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { revealScoresFn } from '../../lib/game.functions'

/**
 * Lazily fetch + cache Tomatometer scores by objectID (used by the optional
 * "peek" feature during picking, and reused for the reveal). Scores are only
 * fetched when explicitly requested, so the default state stays hidden.
 */
export function useScores() {
  const fetchScores = useServerFn(revealScoresFn)
  const [scores, setScores] = useState<Record<string, number>>({})
  // Read latest scores without making `ensure` change identity each render.
  const scoresRef = useRef(scores)
  scoresRef.current = scores
  const inflight = useRef<Set<string>>(new Set())

  const ensure = useCallback(
    async (ids: string[]) => {
      const missing = ids.filter(
        (id) => !(id in scoresRef.current) && !inflight.current.has(id),
      )
      if (missing.length === 0) return
      missing.forEach((id) => inflight.current.add(id))
      try {
        const res = await fetchScores({ data: { objectIDs: missing } })
        setScores((prev) => ({ ...prev, ...res }))
      } catch {
        // leave unknown; a later ensure() will retry
      } finally {
        missing.forEach((id) => inflight.current.delete(id))
      }
    },
    [fetchScores],
  )

  return { scores, ensure }
}

/** RT "fresh" threshold is 60%. */
export function isFresh(score: number) {
  return score >= 60
}
