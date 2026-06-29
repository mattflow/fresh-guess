// Server-function RPC boundary for the game. Safe to import from client code:
// on the client these become fetch calls, so the Playwright/Algolia code in
// `rt-algolia.server.ts` never ships to the browser.
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

/** Search RT movies by title. Returns movies WITHOUT scores (it's a guessing game). */
export const searchMoviesFn = createServerFn({ method: 'POST' })
  .validator(z.object({ query: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    // Imported lazily inside the handler so the server-only module is only
    // resolved on the server.
    const { searchMovies } = await import('./rt-algolia.server')
    return searchMovies(data.query.trim())
  })

/** Fetch Tomatometer scores for picked movies — called only at the reveal step. */
export const revealScoresFn = createServerFn({ method: 'POST' })
  .validator(z.object({ objectIDs: z.array(z.string().min(1)).max(60) }))
  .handler(async ({ data }) => {
    const { getScores } = await import('./rt-algolia.server')
    return getScores(data.objectIDs)
  })
