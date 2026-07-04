// Verifies the mid-game "New game" control (EndGameButton).
// Assumes `pnpm dev` is running on http://localhost:3000.
//
// Covers:
//  - "New game" is visible on the pass gate and starts an inline confirm (no dialog)
//  - Confirming returns to setup with player NAMES preserved and picks cleared
//  - localStorage holds a clean `setup` state afterwards (survives reload)
//  - "New game" is visible during picking; Cancel keeps the game intact
import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:3000'
const log = (...a) => console.log(...a)
const fail = (m) => {
  console.error('✗ FAIL:', m)
  process.exitCode = 1
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // iPhone-ish
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

const settle = () => page.waitForTimeout(1200)
const storedPhase = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('fresh-guess:game') || '{}').phase
    } catch {
      return null
    }
  })

async function startTwoPlayerGame() {
  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByPlaceholder('Player 2 name').fill('Linus')
  const start = page.getByRole('button', { name: /Start game/ })
  await start.waitFor()
  await start.click()
}

async function pickThree(queries) {
  for (const q of queries) {
    const search = page.getByPlaceholder('Search a movie title…')
    await search.fill('')
    await search.fill(q)
    await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
    await page.locator('button.fg-card').first().click()
  }
}

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle()

  // ===== Case 1: New game from the pass gate =====
  await startTwoPlayerGame()
  await page.getByText(/Pass the phone to/).waitFor({ timeout: 8000 })
  log('✓ reached the pass gate')

  const newGameBtn = page.getByRole('button', { name: /New game/ })
  if (!(await newGameBtn.isVisible())) fail('New game control not visible on pass gate')

  await newGameBtn.click()
  // Inline confirm should appear (no native dialog).
  await page.getByText('Start over?').waitFor({ timeout: 4000 })
  log('✓ tapping New game reveals inline "Start over?" confirm')

  await page.getByRole('button', { name: /^Start over$/ }).click()

  // Back on setup with names preserved.
  await page.getByRole('button', { name: /Start game/ }).waitFor({ timeout: 6000 })
  const p1 = await page.getByPlaceholder('Player 1 name').inputValue()
  const p2 = await page.getByPlaceholder('Player 2 name').inputValue()
  if (p1 !== 'Ada' || p2 !== 'Linus') fail(`names not preserved after restart: got "${p1}", "${p2}"`)
  else log('✓ returned to setup with names preserved (Ada, Linus)')

  const phaseAfter = await storedPhase()
  if (phaseAfter !== 'setup') fail(`localStorage phase should be "setup", got "${phaseAfter}"`)
  else log('✓ localStorage holds a clean setup state')

  // Survives a reload (no stale in-progress game).
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle()
  const stillSetup = await page
    .getByRole('button', { name: /Start game/ })
    .isVisible()
    .catch(() => false)
  if (!stillSetup) fail('did not restore setup after reload')
  else log('✓ setup state restored after reload')

  // ===== Case 2: New game during picking, Cancel keeps the game =====
  await startTwoPlayerGame()
  await page.getByRole('button', { name: /I'm Ada/ }).click() // arm Ada's turn -> picking screen
  await page.getByPlaceholder('Search a movie title…').waitFor({ timeout: 8000 })
  await pickThree(['the matrix', 'inception', 'cats'])
  const picksBefore = await page.getByRole('button', { name: 'Remove' }).count()
  if (picksBefore !== 3) fail(`expected 3 picks before cancel, got ${picksBefore}`)

  await page.getByRole('button', { name: /New game/ }).click()
  await page.getByText('Start over?').waitFor({ timeout: 4000 })
  await page.getByRole('button', { name: /Cancel/ }).click()
  // Confirm dismissed, still on picking screen with picks intact.
  const picksAfterCancel = await page.getByRole('button', { name: 'Remove' }).count()
  const confirmGone = !(await page.getByText('Start over?').isVisible().catch(() => false))
  if (!confirmGone) fail('confirm did not dismiss on Cancel')
  if (picksAfterCancel !== 3) fail(`Cancel lost picks: expected 3, got ${picksAfterCancel}`)
  if (confirmGone && picksAfterCancel === 3)
    log('✓ Cancel dismisses the confirm and keeps picks intact')

  // Now actually start over from the picking screen.
  await page.getByRole('button', { name: /New game/ }).click()
  await page.getByRole('button', { name: /^Start over$/ }).click()
  await page.getByRole('button', { name: /Start game/ }).waitFor({ timeout: 6000 })
  const q1 = await page.getByPlaceholder('Player 1 name').inputValue()
  if (q1 !== 'Ada') fail(`names not preserved after picking-screen restart: got "${q1}"`)
  else log('✓ New game from picking screen returns to setup with names preserved')

  if (errors.length) fail('page errors: ' + errors.join(' | '))
  log(process.exitCode ? '\n✗ verify-restart finished with failures' : '\n✓ verify-restart passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
