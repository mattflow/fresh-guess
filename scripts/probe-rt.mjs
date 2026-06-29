// Scratch probe: discover Rotten Tomatoes' Algolia credentials + index/score shape.
// Run: node scripts/probe-rt.mjs   (requires playwright + chromium installed)
// This is a one-off discovery tool, not part of the app runtime.
import { chromium } from 'playwright'

const log = (...a) => console.log(...a)

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
})
const page = await ctx.newPage()

// Capture every Algolia request/response so we learn index name, params + hit shape.
const algoliaHits = []
page.on('response', async (res) => {
  const url = res.url()
  if (/algolia(net)?\.(com|net)/.test(url) && /quer(y|ies)/.test(url)) {
    try {
      const json = await res.json()
      algoliaHits.push({ url, json })
    } catch {}
  }
})

log('→ navigating to rottentomatoes.com')
await page.goto('https://www.rottentomatoes.com', { waitUntil: 'domcontentloaded', timeout: 60000 })

// 1) Read the global RottenTomatoes context object across candidate paths.
const creds = await page.evaluate(() => {
  const RT = window.RottenTomatoes
  const candidates = [
    RT?.context?.thirdParty?.algoliaSearch,
    RT?.thirdParty?.algoliaSearch,
    RT?.context?.algoliaSearch,
    RT?.algoliaSearch,
  ]
  const found = candidates.find((c) => c && (c.aId || c.sId))
  return {
    hasRT: typeof RT !== 'undefined',
    rtTopKeys: RT ? Object.keys(RT) : null,
    contextKeys: RT?.context ? Object.keys(RT.context) : null,
    thirdPartyKeys: RT?.context?.thirdParty
      ? Object.keys(RT.context.thirdParty)
      : RT?.thirdParty
        ? Object.keys(RT.thirdParty)
        : null,
    algoliaSearch: found ?? null,
  }
})
log('\n=== RottenTomatoes context ===')
log(JSON.stringify(creds, null, 2))

// 2) Trigger the site's own search so we can intercept a real Algolia query.
try {
  // The RT header has a search toggle button then an input.
  const searchToggle = page.locator('search-algolia-controls, [data-search="searchAlgoliaInput"], button[aria-label*="earch"]').first()
  await searchToggle.click({ timeout: 5000 }).catch(() => {})
  const input = page.locator('input[type="search"], input[name="search"], [slot="search-input"] input, input[aria-label*="earch"]').first()
  await input.fill('matrix', { timeout: 8000 })
  await page.waitForTimeout(3500)
} catch (e) {
  log('search-trigger note:', e.message)
}

log('\n=== Algolia responses captured: ' + algoliaHits.length + ' ===')
for (const hit of algoliaHits) {
  log('\nURL:', hit.url)
  const results = hit.json?.results ?? [hit.json]
  for (const r of results) {
    log('  indexName:', r?.index)
    const first = r?.hits?.[0]
    if (first) {
      log('  hit keys:', Object.keys(first).join(', '))
      log('  sample hit:', JSON.stringify(first, null, 2).slice(0, 1600))
    }
  }
}

await browser.close()
log('\n✓ done')
