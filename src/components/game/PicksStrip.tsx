import { PICKS_PER_PLAYER, type SelectedMovie } from '../../lib/game-types'
import { ScoreBadge } from './SearchResults'

/**
 * Compact horizontal summary of the current player's picks. Replaces the tall
 * 3-slot grid so the picking chrome stays short enough to keep the search input
 * and results visible above the keyboard.
 */
export default function PicksStrip({
  picks,
  peeking,
  scores,
  onRemove,
}: {
  picks: SelectedMovie[]
  peeking: boolean
  scores: Record<string, number>
  onRemove: (movie: SelectedMovie) => void
}) {
  if (picks.length === 0) {
    return (
      <p className="text-xs text-[var(--fg-muted)]">
        No picks yet — search below to add {PICKS_PER_PLAYER}.
      </p>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {picks.map((m) => (
        <span key={m.objectID} className="fg-card inline-flex items-center gap-1.5 px-2.5 py-1">
          {peeking && <ScoreBadge score={scores[m.objectID]} />}
          <span className="max-w-[9rem] truncate text-xs font-semibold">{m.title}</span>
          <button
            type="button"
            aria-label={`Remove ${m.title}`}
            onClick={() => onRemove(m)}
            className="grid h-5 w-5 shrink-0 cursor-pointer place-items-center rounded-full text-sm text-[var(--fg-danger)] hover:bg-[var(--fg-danger-bg)]"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
