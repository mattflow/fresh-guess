import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { searchMoviesFn } from '../../lib/game.functions'
import type { SelectedMovie } from '../../lib/game-types'

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

/**
 * Debounced movie search. Lifted out of the old MovieSearch component so the
 * input (top chrome) and the results list (scroll region) can live in
 * separate parts of the fixed picking layout.
 */
export function useMovieSearch({
  peeking,
  ensureScores,
}: {
  peeking: boolean
  ensureScores: (ids: string[]) => void
}) {
  const search = useServerFn(searchMoviesFn)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SelectedMovie[]>([])
  const [status, setStatus] = useState<SearchStatus>('idle')
  // Guards against out-of-order responses from rapid typing.
  const reqId = useRef(0)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      setStatus('idle')
      return
    }
    setStatus('loading')
    const id = ++reqId.current
    const handle = setTimeout(async () => {
      try {
        const movies = await search({ data: { query: q } })
        if (id !== reqId.current) return // a newer query superseded this one
        setResults(movies)
        setStatus('done')
      } catch {
        if (id !== reqId.current) return
        setStatus('error')
      }
    }, 300)
    return () => clearTimeout(handle)
  }, [query, search])

  // When peeking, fetch scores for the currently visible results.
  useEffect(() => {
    if (peeking && results.length) ensureScores(results.map((m) => m.objectID))
  }, [peeking, results, ensureScores])

  return { query, setQuery, results, status }
}
