// Verify the compact, keyboard-aware picking layout. Requires a server at BASE
// (default :3000). NOTE: a headless browser can't raise the on-screen keyboard,
// so this asserts the layout *invariants* the keyboard handling relies on
// (fixed column sized to visualViewport, pinned chrome, single scroll region,
// compact chip strip). The live keyboard behaviour still needs a real iOS device.
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3000'
const log = (...a) => console.log(...a)
const fail = (m) => {
  console.error('✗ FAIL:', m)
  process.exitCode = 1
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
const settle = () => page.waitForTimeout(1200)

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle()

  // Solo game → straight to the picking screen (no pass gate).
  await page.getByRole('button', { name: 'Remove player 2' }).click()
  await page.getByPlaceholder('Player 1 name').fill('Solo')
  await page.getByRole('button', { name: /Play solo/ }).click()
  await page.getByPlaceholder('Search a movie title…').waitFor({ timeout: 8000 })
  log('✓ reached the picking screen')

  // 1) Fixed, keyboard-aware column: <section> is position:fixed, sized to the
  //    visualViewport-driven --app-vh var, and fills the viewport height.
  const layout = await page.evaluate(() => {
    const sec = document.querySelector('section')
    const cs = getComputedStyle(sec)
    return {
      position: cs.position,
      appVh: document.documentElement.style.getPropertyValue('--app-vh').trim(),
      secH: Math.round(sec.getBoundingClientRect().height),
      innerH: window.innerHeight,
    }
  })
  if (layout.position !== 'fixed') fail(`section should be position:fixed, got ${layout.position}`)
  if (!/^\d+(\.\d+)?px$/.test(layout.appVh)) fail(`--app-vh not set from visualViewport (got "${layout.appVh}")`)
  if (Math.abs(layout.secH - layout.innerH) > 4) fail(`section (${layout.secH}) should fill viewport (${layout.innerH})`)
  else log(`✓ fixed column sized to visualViewport (--app-vh=${layout.appVh}, ${layout.secH}px)`)

  // 2) Chrome pinned at top, Lock-in pinned at the bottom.
  const geo = await page.evaluate(() => {
    const header = document.querySelector('section > header')
    const lock = [...document.querySelectorAll('section button')].find((b) =>
      /Pick \d more|Reveal my score|Lock in/.test(b.textContent),
    )
    return {
      headerTop: Math.round(header.getBoundingClientRect().top),
      lockBottom: Math.round(lock.getBoundingClientRect().bottom),
      innerH: window.innerHeight,
    }
  })
  if (geo.headerTop > 20) fail(`header not pinned to top (top=${geo.headerTop})`)
  else log(`✓ chrome pinned at top (top=${geo.headerTop})`)
  if (geo.innerH - geo.lockBottom > 40) fail(`Lock-in not pinned to bottom (bottom=${geo.lockBottom}, viewport=${geo.innerH})`)
  else log(`✓ Lock-in pinned at bottom (bottom=${geo.lockBottom}/${geo.innerH})`)

  // 3) Results are the single scroll region (overflow-y:auto, min-height:0 so it
  //    can shrink under the keyboard); the tall 3-slot grid is gone.
  const scroll = await page.evaluate(() => {
    const region = document.querySelector('section > div.overflow-y-auto')
    if (!region) return null
    const cs = getComputedStyle(region)
    return { overflowY: cs.overflowY, minH: cs.minHeight, hasOldGrid: !!document.querySelector('section .grid-cols-3') }
  })
  if (!scroll) fail('no single overflow-y scroll region found')
  else {
    if (scroll.overflowY !== 'auto') fail(`scroll region overflowY should be auto, got ${scroll.overflowY}`)
    if (scroll.minH !== '0px') fail(`scroll region needs min-height:0 to shrink, got ${scroll.minH}`)
    if (scroll.hasOldGrid) fail('the tall 3-column pick-slot grid should be gone (replaced by chip strip)')
    if (!process.exitCode) log('✓ single scrollable results region (min-height:0); no tall pick grid')
  }

  // 4) Picks show as a compact chip strip in the header (title + remove).
  const searchBox = page.getByPlaceholder('Search a movie title…')
  await searchBox.fill('the matrix')
  await page.locator('section > div.overflow-y-auto button.fg-card').first().waitFor({ timeout: 15000 })
  await page.locator('section > div.overflow-y-auto button.fg-card').first().click()
  await page.waitForTimeout(300)
  const chipCount = await page.locator('section header span.fg-card').count()
  const removeCount = await page.getByRole('button', { name: /^Remove / }).count()
  if (chipCount < 1) fail('picked movie did not appear as a chip in the header strip')
  else if (removeCount < 1) fail('chip is missing its Remove control')
  else log(`✓ pick shows as a compact header chip with a Remove control`)

  if (errors.length) fail('page errors: ' + errors.join(' | '))
  log(process.exitCode ? '\n✗ compact-layout checks finished with failures' : '\n✓ compact keyboard-aware layout passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
