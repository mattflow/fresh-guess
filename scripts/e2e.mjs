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

  async function takeTurn(name, queries) {
    await page.getByRole('button', { name: new RegExp(`I'm ${name}`) }).click()
    for (const q of queries) {
      const search = page.getByPlaceholder('Search a movie title…')
      await search.fill('')
      await search.fill(q)
      // wait for at least one result row
      await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
      // click the first not-yet-picked result
      const row = page.locator('button.fg-card').first()
      await row.click()
    }
    // confirm 3 picks selected (tray shows Remove buttons)
    const removeBtns = await page.getByRole('button', { name: 'Remove' }).count()
    if (removeBtns !== 3) fail(`${name}: expected 3 picks, got ${removeBtns}`)
    else log(`✓ ${name} picked 3 movies`)
    await page.getByRole('button', { name: /Lock in/ }).click()
  }

  // Distinct-ish queries so each pick is a different movie
  await takeTurn('Ada', ['the matrix', 'inception', 'cats'])

  // --- Persistence check: reload mid-game (now Linus's pass screen) ---
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle()
  const survived = await page
    .getByText(/Pass the phone to/)
    .waitFor({ timeout: 8000 })
    .then(() => true)
    .catch(() => false)
  if (survived) log('✓ game state survived a page reload (localStorage)')
  else fail('game did not resume after reload')

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

  // Reveal pills must be color-coded fresh/splat (matching Peek), not plain gray,
  // and their text must stay legible on the accent. The pills are ~11.5px bold
  // (normal text under WCAG, so AA needs 4.5:1); we require >= 4.5:1 on every pill.
  const srgb = (c) => {
    const x = c / 255
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
  }
  const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
  const parse = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
  const contrast = (fg, bg) => {
    const [l1, l2] = [lum(parse(fg)), lum(parse(bg))].sort((a, b) => b - a)
    return (l1 + 0.05) / (l2 + 0.05)
  }
  // The fresh/splat accent colors, so we can confirm each reveal pill sits on one
  // of them (and not the plain-gray default --fg-pill-bg).
  const hexToRgb = (h) => {
    const n = parseInt(h.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const accents = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    return [cs.getPropertyValue('--color-fresh').trim(), cs.getPropertyValue('--color-splat').trim()]
  })
  const accentRgb = accents.map((a) => hexToRgb(a).join())
  const pillStyles = await page.locator('.fg-pill').filter({ hasText: '%' }).evaluateAll((els) =>
    els.map((el) => {
      const cs = getComputedStyle(el)
      return { color: cs.color, bg: cs.backgroundColor }
    }),
  )
  let worst = Infinity
  let offAccent = 0
  for (const { color, bg } of pillStyles) {
    worst = Math.min(worst, contrast(color, bg))
    // An accent pill's bg matches --color-fresh or --color-splat; a plain-gray one won't.
    if (!accentRgb.includes(parse(bg).join())) offAccent++
  }
  if (offAccent > 0) fail(`${offAccent}/${pillStyles.length} reveal pills are not on a fresh/splat accent`)
  else log(`✓ all ${pillStyles.length} reveal pills use fresh/splat accents (not gray)`)
  if (worst < 4.5) fail(`reveal pill text contrast too low: ${worst.toFixed(2)}:1 (need >= 4.5)`)
  else log(`✓ reveal pill text legible on accents (min contrast ${worst.toFixed(2)}:1)`)

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
