import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { searchMoviesFn } from '../../lib/game.functions'
import { PICKS_PER_PLAYER, type SelectedMovie } from '../../lib/game-types'

export default function MovieSearch({
  picks,
  onToggle,
}: {
  picks: SelectedMovie[]
  onToggle: (movie: SelectedMovie) => void
}) {
  const search = useServerFn(searchMoviesFn)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SelectedMovie[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
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

  const isFull = picks.length >= PICKS_PER_PLAYER
  const isPicked = (id: string) => picks.some((m) => m.objectID === id)

  return (
    <div>
      <input
        className="fg-input"
        type="search"
        placeholder="Search a movie title…"
        value={query}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-3 flex flex-col gap-2">
        {status === 'loading' && <p className="text-sm text-zinc-500">Searching…</p>}
        {status === 'error' && (
          <p className="rounded-lg bg-[#2a1a1a] px-3 py-2 text-sm text-[#f0a3a3]">
            Couldn't reach the movie database. Try again.
          </p>
        )}
        {status === 'done' && results.length === 0 && (
          <p className="text-sm text-zinc-500">No scored movies match "{query.trim()}".</p>
        )}

        {results.map((m) => {
          const picked = isPicked(m.objectID)
          return (
            <button
              key={m.objectID}
              type="button"
              className="fg-card flex items-center gap-3 p-2.5 text-left disabled:opacity-40"
              disabled={!picked && isFull}
              onClick={() => onToggle(m)}
            >
              <Poster url={m.posterUrl} title={m.title} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{m.title}</span>
                {m.year != null && <span className="block text-xs text-zinc-500">{m.year}</span>}
              </span>
              <span
                className={
                  'fg-pill shrink-0 ' +
                  (picked ? 'bg-[var(--color-fresh)] text-black' : '')
                }
              >
                {picked ? '✓ Picked' : isFull ? 'Full' : '+ Pick'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Poster({ url, title }: { url?: string; title: string }) {
  if (!url) {
    return (
      <span
        className="grid h-14 w-10 shrink-0 place-items-center rounded-md bg-[#222229] text-zinc-500"
        aria-hidden
      >
        🎬
      </span>
    )
  }
  return (
    <img
      src={url}
      alt={`${title} poster`}
      loading="lazy"
      className="h-14 w-10 shrink-0 rounded-md object-cover"
    />
  )
}
