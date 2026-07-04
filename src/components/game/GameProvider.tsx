import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import {
  PICKS_PER_PLAYER,
  type GameState,
  type Player,
  type SelectedMovie,
} from '../../lib/game-types'

const STORAGE_KEY = 'fresh-guess:game'
const MAX_PLAYERS = 8

function emptyPlayer(id: string, name = ''): Player {
  return { id, name, picks: [] }
}

// Deterministic initial state so server and first client render match (no IDs
// from crypto/Date at module load). New IDs are minted in client event handlers.
const initialState: GameState = {
  phase: 'setup',
  players: [emptyPlayer('p1'), emptyPlayer('p2')],
  currentPlayerIndex: 0,
}

type Action =
  | { type: 'hydrate'; state: GameState }
  | { type: 'addPlayer'; id: string }
  | { type: 'removePlayer'; id: string }
  | { type: 'setName'; id: string; name: string }
  | { type: 'startGame' }
  | { type: 'togglePick'; movie: SelectedMovie }
  | { type: 'lockIn' }
  | { type: 'playAgain' }
  | { type: 'restartSetup' }
  | { type: 'newGame'; ids: [string, string] }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'hydrate':
      return action.state

    case 'addPlayer':
      if (state.players.length >= MAX_PLAYERS) return state
      return { ...state, players: [...state.players, emptyPlayer(action.id)] }

    case 'removePlayer':
      if (state.players.length <= 1) return state
      return { ...state, players: state.players.filter((p) => p.id !== action.id) }

    case 'setName':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, name: action.name } : p,
        ),
      }

    case 'startGame':
      return {
        phase: 'picking',
        currentPlayerIndex: 0,
        players: state.players.map((p) => ({ ...p, picks: [] })),
      }

    case 'togglePick': {
      const players = state.players.map((p, i) => {
        if (i !== state.currentPlayerIndex) return p
        const exists = p.picks.some((m) => m.objectID === action.movie.objectID)
        if (exists) {
          return { ...p, picks: p.picks.filter((m) => m.objectID !== action.movie.objectID) }
        }
        if (p.picks.length >= PICKS_PER_PLAYER) return p
        return { ...p, picks: [...p.picks, action.movie] }
      })
      return { ...state, players }
    }

    case 'lockIn': {
      const isLast = state.currentPlayerIndex >= state.players.length - 1
      if (isLast) return { ...state, phase: 'reveal' }
      return { ...state, currentPlayerIndex: state.currentPlayerIndex + 1 }
    }

    case 'playAgain':
      return {
        phase: 'picking',
        currentPlayerIndex: 0,
        players: state.players.map((p) => ({ ...p, picks: [] })),
      }

    // Abandon an in-progress game and return to setup, keeping the current
    // players and their names (picks cleared). Unlike `newGame`, no reset to
    // blank players — used by the mid-game "New game" control.
    case 'restartSetup':
      return {
        phase: 'setup',
        currentPlayerIndex: 0,
        players: state.players.map((p) => ({ ...p, picks: [] })),
      }

    case 'newGame':
      return {
        phase: 'setup',
        currentPlayerIndex: 0,
        players: [emptyPlayer(action.ids[0]), emptyPlayer(action.ids[1])],
      }

    default:
      return state
  }
}

function isValidState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<GameState>
  return (
    (v.phase === 'setup' || v.phase === 'picking' || v.phase === 'reveal') &&
    Array.isArray(v.players) &&
    typeof v.currentPlayerIndex === 'number'
  )
}

type GameContextValue = { state: GameState; dispatch: Dispatch<Action> }
const GameContext = createContext<GameContextValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Restore any in-progress game from localStorage after mount (client only),
  // so the first render matches the server and a refresh resumes the round.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (isValidState(parsed)) dispatch({ type: 'hydrate', state: parsed })
    } catch {
      // ignore corrupt storage
    }
  }, [])

  // Persist on every change. picks carry no scores, so the "answer" is never stored.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage may be unavailable (private mode) — game still works in memory
    }
  }, [state])

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within a GameProvider')
  return ctx
}

/** Mint a stable unique id for a new player (client-side event handlers only). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `p-${Math.floor(Math.random() * 1e9)}`
}
