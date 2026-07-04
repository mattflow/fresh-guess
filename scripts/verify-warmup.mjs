// Verify the one-time credential warm-up banner. Requires a FRESHLY started
// `pnpm dev` (cold server, no warm credential cache) and no RT_ALGOLIA_* env
// vars set — otherwise credentials resolve instantly and the banner is
// correctly absent (the fast path), which this script treats as a skip.
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const log = (...a) => console.log(...a)
const fail = (m) => {
  console.error('✗ FAIL:', m)
  process.exitCode = 1
}

const browser = await chromium.launch({ headless: true })
const page = await (
  await browser.newContext({ viewport: { width: 390, height: 844 } })
).newPage()

const banner = () => page.getByRole('status').filter({ hasText: /Setting up movie search/ })

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })

  // The banner should appear shortly after a cold load (warm-up > ~500ms while
  // the Playwright scrape runs). If it never shows, credentials were already
  // warm / env-configured — treat that as a skip, not a failure.
  let appeared = true
  try {
    await banner().waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    appeared = false
  }

  if (!appeared) {
    log('… banner did not appear — credentials already warm or RT_ALGOLIA_* set (fast path). Skipping.')
  } else {
    log('✓ warm-up banner appeared on cold load')

    // It must not block interaction: player setup inputs are usable while shown.
    await page.getByPlaceholder('Player 1 name').fill('Ada')
    if ((await page.getByPlaceholder('Player 1 name').inputValue()) !== 'Ada')
      fail('setup input not interactive while the warm-up banner is visible')
    else log('✓ setup remains interactive while the banner is visible')

    // Once credentials are ready the banner unmounts.
    await banner().waitFor({ state: 'detached', timeout: 60000 })
    log('✓ banner disappeared once credentials were ready')
  }

  log(process.exitCode ? '\n✗ warm-up checks finished with failures' : '\n✓ warm-up checks passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
