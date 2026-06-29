import { TARGET } from '../../lib/game-types'
import { newId, useGame } from './GameProvider'

export default function PlayerSetup() {
  const { state, dispatch } = useGame()
  const namedCount = state.players.filter((p) => p.name.trim()).length
  const canStart = state.players.length >= 2 && namedCount === state.players.length

  return (
    <section className="fg-rise">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Fresh <span className="text-[var(--color-splat)]">Guess</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Secretly pick 3 movies. Get their Rotten Tomatoes scores closest to{' '}
          <strong className="text-zinc-200">{TARGET}</strong>. No peeking — closest wins.
        </p>
      </header>

      <div className="fg-card p-5">
        <p className="fg-kicker">Players</p>
        <div className="mt-3 flex flex-col gap-2">
          {state.players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="fg-pill shrink-0">P{i + 1}</span>
              <input
                className="fg-input"
                placeholder={`Player ${i + 1} name`}
                value={p.name}
                maxLength={24}
                autoComplete="off"
                onChange={(e) => dispatch({ type: 'setName', id: p.id, name: e.target.value })}
              />
              <button
                type="button"
                className="fg-btn fg-btn-danger shrink-0 px-3"
                aria-label={`Remove player ${i + 1}`}
                disabled={state.players.length <= 2}
                onClick={() => dispatch({ type: 'removePlayer', id: p.id })}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="fg-btn fg-btn-ghost mt-3 w-full"
          disabled={state.players.length >= 8}
          onClick={() => dispatch({ type: 'addPlayer', id: newId() })}
        >
          + Add player
        </button>
      </div>

      <button
        type="button"
        className="fg-btn fg-btn-primary mt-4 w-full py-4 text-base"
        disabled={!canStart}
        onClick={() => dispatch({ type: 'startGame' })}
      >
        Start game →
      </button>
      {!canStart && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Add at least 2 players and name everyone.
        </p>
      )}
    </section>
  )
}
