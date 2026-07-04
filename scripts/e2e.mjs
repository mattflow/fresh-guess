// End-to-end smoke test driving the real app in a browser.
// Assumes `pnpm dev` is running on http://localhost:3000.
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

// Wait for React hydration so controlled inputs/handlers are live before we type.
const settle = () => page.waitForTimeout(1200)

try {
  // --- Setup: register two players ---
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle()
  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByPlaceholder('Player 2 name').fill('Linus')
  const start = page.getByRole('button', { name: /Start game/ })
  await start.waitFor()
  if (await start.isDisabled()) fail('Start button still disabled after naming players')
  await start.click()
  log('✓ started game with 2 players')

  async function takeTurn(name, queries, { midReload = false } = {}) {
    await page.getByRole('button', { name: new RegExp(`I'm ${name}`) }).click()
    // Each player's turn must start with an empty search box - the previous
    // player's query must not carry over (issue #11).
    const startValue = await page.getByPlaceholder('Search a movie title…').inputValue()
    if (startValue !== '') fail(`${name}: search box not cleared on turn start (got "${startValue}")`)
    else log(`✓ ${name}: search box empty at turn start`)
    for (let i = 0; i < queries.length; i++) {
      const search = page.getByPlaceholder('Search a movie title…')
      await search.fill('')
      await search.fill(queries[i])
      // wait for at least one result row
      await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
      // click the first not-yet-picked result
      const row = page.locator('button.fg-card').first()
      await row.click()

      // After the first pick, optionally reload to prove an in-progress game
      // (mid-turn picks) survives a refresh via localStorage. The reload
      // remounts, re-arming this player's pass gate, so tap back in and
      // confirm the pick is still there before finishing the turn.
      if (midReload && i === 0) {
        await page.reload({ waitUntil: 'domcontentloaded' })
        await settle()
        await page.getByRole('button', { name: new RegExp(`I'm ${name}`) }).click()
        const survivedPicks = await page.getByRole('button', { name: 'Remove' }).count()
        if (survivedPicks !== 1) fail(`${name}: mid-turn pick did not survive reload (got ${survivedPicks})`)
        else log(`✓ ${name}: in-progress pick survived a page reload (localStorage)`)
      }
    }
    // confirm 3 picks selected (tray shows Remove buttons)
    const removeBtns = await page.getByRole('button', { name: 'Remove' }).count()
    if (removeBtns !== 3) fail(`${name}: expected 3 picks, got ${removeBtns}`)
    else log(`✓ ${name} picked 3 movies`)
    await page.getByRole('button', { name: /Lock in/ }).click()
  }

  // --- Persistence check: reload at the initial pass screen ---
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle()
  const survived = await page
    .getByText(/Pass the phone to/)
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (survived) log('✓ game state survived a page reload (localStorage)')
  else fail('game did not resume after reload')

  // Distinct-ish queries so each pick is a different movie. Ada reloads
  // mid-turn to prove in-progress picks persist; Linus follows Ada with no
  // reload between them, so the turn switch (and search-box clearing, issue
  // #11) is exercised in-memory - a reload would remount and mask a stale query.
  await takeTurn('Ada', ['the matrix', 'inception', 'cats'], { midReload: true })
  await takeTurn('Linus', ['interstellar', 'parasite', 'jaws'])

  // --- Reveal ---
  await page.getByText(/wins!|It's a tie!/).waitFor({ timeout: 20000 })
  const heading = (await page.locator('h2').first().innerText()).replace(/\n/g, ' ')
  log('✓ reveal heading:', heading)

  // Read each player's total + that scores are shown as percentages
  const totals = await page.locator('.fg-card .text-2xl').allInnerTexts()
  const pct = await page.locator('.fg-pill').filter({ hasText: '%' }).count()
  log('  totals shown:', totals.join(', '))
  log('  score pills (%):', pct)
  if (pct < 6) fail(`expected >=6 score percentages at reveal, got ${pct}`)

  // Winner sanity: heading mentions a name or tie
  if (!/wins!|tie/i.test(heading)) fail('reveal heading missing winner/tie')

  // --- Play again keeps players ---
  await page.getByRole('button', { name: /Play again/ }).click()
  await page.getByRole('button', { name: /I'm Ada/ }).waitFor({ timeout: 8000 })
  log('✓ "Play again" restarted with same players (Ada first)')

  if (errors.length) fail('page errors: ' + errors.join(' | '))
  log(process.exitCode ? '\n✗ E2E finished with failures' : '\n✓ E2E passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
