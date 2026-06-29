// Server-only: Rotten Tomatoes has no public API, so we read the Algolia
// credentials that the RT website itself exposes in its runtime
// `window.RottenTomatoes.thirdParty.algoliaSearch` context object (via Playwright),
// then query Algolia's `content_rt` index for movie titles + Tomatometer scores.
//
// The `.server.ts` suffix keeps Playwright out of the client bundle (TanStack Start
// build-time import protection). This module must never be imported by client code;
// it is only reached through the server functions in `game.functions.ts`.
import { algoliasearch } from 'algoliasearch'

/** Algolia index holding RT movies + TV (we filter to movies). */
const RT_INDEX = 'content_rt'
/** RT rotates its public search key periodically — refresh the scrape this often. */
const CREDENTIAL_TTL_MS = 6 * 60 * 60 * 1000 // 6h
/** Last-known-good public keys (scraped from RT's own client), used only if a live
 *  scrape fails. These are search-only, already exposed in RT's HTML — not secrets. */
const FALLBACK = { aId: '79FRDP12PN', sId: '175588f6e5f8319b27702e4cc4013561' }

type Credentials = { aId: string; sId: string; indexName: string }

let cache: { creds: Credentials; fetchedAt: number } | null = null

/** A movie as shown to the client during picking — deliberately WITHOUT its score. */
export type MovieResult = {
  objectID: string
  title: string
  year?: number
  posterUrl?: string
}

/** Read the Algolia keys RT embeds in its page, with TTL cache + fallbacks. */
export async function getAlgoliaCredentials(forceRefresh = false): Promise<Credentials> {
  // 1) Env fast-path — set these in prod/serverless to skip Playwright entirely.
  const envApp = process.env.RT_ALGOLIA_APP_ID
  const envKey = process.env.RT_ALGOLIA_SEARCH_KEY
  if (envApp && envKey) {
    return { aId: envApp, sId: envKey, indexName: process.env.RT_ALGOLIA_INDEX || RT_INDEX }
  }

  // 2) Cached scrape still fresh?
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CREDENTIAL_TTL_MS) {
    return cache.creds
  }

  // 3) Live scrape via Playwright.
  try {
    const scraped = await scrapeCredentials()
    cache = { creds: { ...scraped, indexName: RT_INDEX }, fetchedAt: Date.now() }
    return cache.creds
  } catch (err) {
    console.warn('[rt-algolia] Playwright scrape failed, using fallback keys:', (err as Error).message)
    // 4) Fall back to last-known-good (or a stale cache, whichever exists).
    return cache?.creds ?? { ...FALLBACK, indexName: RT_INDEX }
  }
}

async function scrapeCredentials(): Promise<{ aId: string; sId: string }> {
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.goto('https://www.rottentomatoes.com', {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    })
    const creds = await page.evaluate(() => {
      const RT = (window as unknown as { RottenTomatoes?: any }).RottenTomatoes
      const candidates = [
        RT?.context?.thirdParty?.algoliaSearch,
        RT?.thirdParty?.algoliaSearch,
        RT?.context?.algoliaSearch,
        RT?.algoliaSearch,
      ]
      return candidates.find((c) => c && c.aId && c.sId) ?? null
    })
    if (!creds?.aId || !creds?.sId) {
      throw new Error('algoliaSearch context not found on rottentomatoes.com')
    }
    return { aId: creds.aId, sId: creds.sId }
  } finally {
    await browser.close()
  }
}

function makeClient(creds: Credentials) {
  return algoliasearch(creds.aId, creds.sId)
}

function criticsScore(hit: any): number | null {
  const s = hit?.rottenTomatoes?.criticsScore
  return typeof s === 'number' && Number.isFinite(s) ? s : null
}

/**
 * Search RT movies by title. Returns up to `hitsPerPage` movies that HAVE a
 * Tomatometer score (every pickable movie must be scorable), WITHOUT exposing
 * the score to the client.
 */
export async function searchMovies(query: string): Promise<MovieResult[]> {
  const creds = await getAlgoliaCredentials()
  const run = (c: Credentials) =>
    makeClient(c).search({
      requests: [{ indexName: c.indexName, query, hitsPerPage: 20 }],
    })

  let results
  try {
    results = (await run(creds)).results
  } catch (err) {
    // Key likely rotated — force a fresh scrape once, then retry.
    const fresh = await getAlgoliaCredentials(true)
    results = (await run(fresh)).results
  }

  const hits: any[] = (results as any)[0]?.hits ?? []
  return hits
    .filter((h) => h?.type === 'movie' && criticsScore(h) !== null)
    .slice(0, 8)
    .map((h) => ({
      objectID: String(h.objectID),
      title: String(h.title ?? 'Untitled'),
      year: typeof h.releaseYear === 'number' ? h.releaseYear : undefined,
      posterUrl: h.posterImageUrl || undefined,
    }))
}

/**
 * Fetch Tomatometer (critics) scores for the given objectIDs — called only at
 * the reveal step so scores never reach the client during picking.
 * Returns a map of objectID -> criticsScore (omitting any that lack one).
 */
export async function getScores(objectIDs: string[]): Promise<Record<string, number>> {
  if (objectIDs.length === 0) return {}
  const creds = await getAlgoliaCredentials()
  const fetchObjects = (c: Credentials) =>
    makeClient(c).getObjects({
      requests: objectIDs.map((objectID) => ({
        indexName: c.indexName,
        objectID,
        attributesToRetrieve: ['rottenTomatoes', 'title'],
      })),
    })

  let results
  try {
    results = (await fetchObjects(creds)).results
  } catch {
    const fresh = await getAlgoliaCredentials(true)
    results = (await fetchObjects(fresh)).results
  }

  const out: Record<string, number> = {}
  for (const obj of results as any[]) {
    if (!obj) continue
    const score = criticsScore(obj)
    if (score !== null) out[String(obj.objectID)] = score
  }
  return out
}
