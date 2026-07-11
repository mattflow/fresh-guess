import { useState } from 'react'
import { TARGET, TARGET_MAX, TARGET_MIN } from '../../lib/game-types'
import { newId, useGame } from './GameProvider'

export default function PlayerSetup() {
  const { state, dispatch } = useGame()
  const namedCount = state.players.filter((p) => p.name.trim()).length

  // Editable target for this game. Held as a string so the field can be cleared
  // mid-edit; parsed + range-checked before it can start a game.
  const [targetInput, setTargetInput] = useState(String(state.target))
  const target = Number(targetInput)
  const targetValid =
    targetInput.trim() !== '' &&
    Number.isInteger(target) &&
    target >= TARGET_MIN &&
    target <= TARGET_MAX

  const clampTarget = () => {
    const n = Number(targetInput)
    if (!Number.isFinite(n) || targetInput.trim() === '') {
      setTargetInput(String(TARGET))
      return
    }
    setTargetInput(String(Math.min(TARGET_MAX, Math.max(TARGET_MIN, Math.round(n)))))
  }

  const canStart =
    state.players.length >= 1 && namedCount === state.players.length && targetValid

  return (
    <section className="fg-rise">
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Fresh <span className="text-[var(--color-splat)]">Guess</span>
        </h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">
          Secretly pick 3 movies. Get their Rotten Tomatoes scores closest to{' '}
          <strong className="text-[var(--fg-text)]">{targetValid ? target : TARGET}</strong>. No
          peeking — play solo or pass the phone, closest wins.
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
                disabled={state.players.length <= 1}
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

      <div className="fg-card mt-4 p-5">
        <p className="fg-kicker">Target score</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="fg-pill shrink-0">🎯</span>
          <input
            className="fg-input"
            type="number"
            inputMode="numeric"
            min={TARGET_MIN}
            max={TARGET_MAX}
            step={1}
            aria-label="Target score"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onBlur={clampTarget}
          />
        </div>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          The number to aim for ({TARGET_MIN}–{TARGET_MAX}). Default {TARGET}.
        </p>
      </div>

      <button
        type="button"
        className="fg-btn fg-btn-primary mt-4 w-full py-4 text-base"
        disabled={!canStart}
        onClick={() => dispatch({ type: 'startGame', target })}
      >
        {state.players.length === 1 ? 'Play solo →' : 'Start game →'}
      </button>
      {!canStart && (
        <p className="mt-2 text-center text-xs text-[var(--fg-muted)]">
          {targetValid
            ? 'Name everyone to start. One player is fine for a solo challenge.'
            : `Set a target between ${TARGET_MIN} and ${TARGET_MAX} to start.`}
        </p>
      )}
    </section>
  )
}
