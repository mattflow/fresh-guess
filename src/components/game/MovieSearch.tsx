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
        className="demo-input"
        type="search"
        placeholder="Search a movie title…"
        value={query}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="mt-3 flex flex-col gap-2">
        {status === 'loading' && <p className="demo-muted text-sm">Searching…</p>}
        {status === 'error' && (
          <p className="demo-alert demo-alert-danger text-sm">
            Couldn't reach the movie database. Try again.
          </p>
        )}
        {status === 'done' && results.length === 0 && (
          <p className="demo-muted text-sm">No scored movies match "{query.trim()}".</p>
        )}

        {results.map((m) => {
          const picked = isPicked(m.objectID)
          return (
            <button
              key={m.objectID}
              type="button"
              className="demo-list-item flex items-center gap-3 text-left disabled:opacity-50"
              disabled={!picked && isFull}
              onClick={() => onToggle(m)}
            >
              <Poster url={m.posterUrl} title={m.title} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-[var(--sea-ink)]">
                  {m.title}
                </span>
                {m.year != null && (
                  <span className="demo-muted block text-xs">{m.year}</span>
                )}
              </span>
              <span
                className={
                  'demo-pill shrink-0 ' +
                  (picked ? 'border-[var(--lagoon-deep)] text-[var(--sea-ink)]' : '')
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
        className="grid h-14 w-10 shrink-0 place-items-center rounded-md bg-[var(--chip-bg)] text-[var(--sea-ink-soft)]"
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
