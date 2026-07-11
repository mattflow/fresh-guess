// Shared, client-safe types + constants for Fresh Guess.
// No server-only imports here — this is imported by both client and server code.

/** Default goal — players aim for their 3 Tomatometer scores to sum to this.
 *  The target is editable at game start (see GameState.target); this is the
 *  value the setup screen starts from. */
export const TARGET = 160

/** Allowed range for a custom target: 3 picks × 0–100% each. */
export const TARGET_MIN = 0
export const TARGET_MAX = 300

/** How many movies each player picks per round. */
export const PICKS_PER_PLAYER = 3

/** A movie a player has selected — stored WITHOUT its score (scores stay hidden
 *  until the reveal, and are never persisted to localStorage). */
export type SelectedMovie = {
  objectID: string
  title: string
  year?: number
  posterUrl?: string
}

export type Player = {
  id: string
  name: string
  picks: SelectedMovie[] // 0..PICKS_PER_PLAYER
}

export type Phase = 'setup' | 'picking' | 'reveal'

export type GameState = {
  phase: Phase
  players: Player[]
  /** Index into players[] whose turn it currently is (during 'picking'). */
  currentPlayerIndex: number
  /** The score every player is aiming for this game (set on the setup screen). */
  target: number
}

/** Per-player computed result shown on the reveal screen. */
export type PlayerResult = {
  player: Player
  scores: (number | null)[] // aligned with player.picks
  total: number
  distance: number // |total - target|
  isWinner: boolean
}
