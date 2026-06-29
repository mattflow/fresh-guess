// Verify single-player (solo) mode. Requires a server running at BASE (default :3000).
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3000'
const log = (...a) => console.log(...a)
const fail = (m) => {
  console.error('✗ FAIL:', m)
  process.exitCode = 1
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const settle = () => page.waitForTimeout(1200)

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle()

  // Drop to a single player.
  await page.getByRole('button', { name: 'Remove player 2' }).click()
  if ((await page.getByPlaceholder(/Player \d name/).count()) !== 1)
    fail('expected 1 player input after removing player 2')
  await page.getByPlaceholder('Player 1 name').fill('Solo')

  // Button should read "Play solo".
  const startBtn = page.getByRole('button', { name: /Play solo/ })
  if (!(await startBtn.isVisible())) fail('"Play solo" button not shown for 1 player')
  await startBtn.click()
  log('✓ started a solo game (1 player)')

  // No "pass the phone" gate in solo — should land straight on the picking screen.
  if (await page.getByText(/Pass the phone/).isVisible().catch(() => false))
    fail('solo should skip the pass-the-phone gate')
  await page.getByText(/Solo round/).waitFor({ timeout: 8000 })
  log('✓ no pass-the-phone gate; "Solo round" picking screen shown')

  // Pick 3 movies.
  for (const q of ['the matrix', 'inception', 'jaws']) {
    const s = page.getByPlaceholder('Search a movie title…')
    await s.fill('')
    await s.fill(q)
    await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
    await page.locator('button.fg-card').first().click()
  }
  if ((await page.getByRole('button', { name: 'Remove' }).count()) !== 3)
    fail('expected 3 picks')

  await page.getByRole('button', { name: /Reveal my score/ }).click()
  log('✓ picked 3 and tapped "Reveal my score"')

  // Solo reveal: a "You scored" line, and NO winner/tie language.
  await page.getByText(/You scored/).waitFor({ timeout: 20000 })
  const heading = (await page.locator('h2').first().innerText()).replace(/\n/g, ' ')
  if (/wins!|tie/i.test(heading)) fail(`solo reveal should not say wins/tie — got "${heading}"`)
  const scoreCount = await page.locator('.fg-pill').filter({ hasText: '%' }).count()
  if (scoreCount !== 3) fail(`expected 3 score pills, got ${scoreCount}`)
  log(`✓ solo reveal: "${heading}" with 3 scores, no winner/tie framing`)

  // Play again keeps the solo player and returns to picking (no pass gate).
  await page.getByRole('button', { name: /Play again/ }).click()
  await page.getByText(/Solo round/).waitFor({ timeout: 8000 })
  log('✓ "Play again" restarts the solo round')

  log(process.exitCode ? '\n✗ solo checks finished with failures' : '\n✓ solo mode passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
