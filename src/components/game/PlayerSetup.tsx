import { TARGET } from '../../lib/game-types'
import { newId, useGame } from './GameProvider'

export default function PlayerSetup() {
  const { state, dispatch } = useGame()
  const namedCount = state.players.filter((p) => p.name.trim()).length
  const canStart = state.players.length >= 2 && namedCount === state.players.length

  return (
    <section className="island-shell rise-in p-5 sm:p-7">
      <p className="island-kicker">Set up</p>
      <h2 className="display-title mt-1 text-2xl text-[var(--sea-ink)] sm:text-3xl">
        Who's playing?
      </h2>
      <p className="demo-muted mt-2 text-sm">
        Add at least 2 players. On your turn you'll secretly pick 3 movies, aiming for a
        Tomatometer total closest to <strong className="text-[var(--sea-ink)]">{TARGET}</strong>.
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {state.players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="demo-pill shrink-0">P{i + 1}</span>
            <input
              className="demo-input"
              placeholder={`Player ${i + 1} name`}
              value={p.name}
              maxLength={24}
              autoComplete="off"
              onChange={(e) => dispatch({ type: 'setName', id: p.id, name: e.target.value })}
            />
            <button
              type="button"
              className="demo-button demo-button-danger demo-input-fit shrink-0"
              aria-label={`Remove player ${i + 1}`}
              disabled={state.players.length <= 2}
              onClick={() => dispatch({ type: 'removePlayer', id: p.id })}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className="demo-button demo-button-secondary"
          disabled={state.players.length >= 8}
          onClick={() => dispatch({ type: 'addPlayer', id: newId() })}
        >
          + Add player
        </button>
        <button
          type="button"
          className="demo-button sm:ml-auto"
          disabled={!canStart}
          onClick={() => dispatch({ type: 'startGame' })}
        >
          Start game →
        </button>
      </div>
      {!canStart && (
        <p className="demo-muted mt-3 text-xs">Give every player a name to start.</p>
      )}
    </section>
  )
}
