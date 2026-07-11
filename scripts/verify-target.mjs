// Verify the editable target score (issue #15). Requires a server running at
// BASE (default :3000). Covers: validation gating, a custom target flowing
// through the pass gate / picking header / reveal, persistence across reload,
// and backward-compat fallback for old saves with no `target` field.
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

const TARGET = '200' // custom, deliberately not the 160 default

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle()

  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByPlaceholder('Player 2 name').fill('Linus')

  const targetInput = page.getByLabel('Target score')
  const start = page.getByRole('button', { name: /Start game/ })

  // --- Validation: empty / out-of-range target blocks Start ---
  await targetInput.fill('')
  if (!(await start.isDisabled())) fail('Start enabled with an empty target')
  else log('✓ empty target disables Start')

  await targetInput.fill('999')
  if (!(await start.isDisabled())) fail('Start enabled with an out-of-range target (999)')
  else log('✓ out-of-range target (999) disables Start')

  // --- Set a valid custom target and start ---
  await targetInput.fill(TARGET)
  if (await start.isDisabled()) fail(`Start still disabled with a valid target (${TARGET})`)
  await start.click()
  log(`✓ started a game with target ${TARGET}`)

  // --- Persistence: reload at the pass gate, target must survive ---
  await page.getByText(/Pass the phone to/).waitFor({ timeout: 8000 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle()
  const gate = await page.getByText(new RegExp(`close to ${TARGET}`)).innerText().catch(() => '')
  if (!gate) fail(`pass gate did not mention target ${TARGET} after reload`)
  else log(`✓ pass gate shows target ${TARGET} and survived a reload`)

  // --- Picking header reflects the target ---
  await page.getByRole('button', { name: /I'm Ada/ }).click()
  const header = await page.getByRole('heading', { name: new RegExp(`Pick 3 for ${TARGET}`) })
    .innerText()
    .catch(() => '')
  if (!header) fail(`picking header did not read "Pick 3 for ${TARGET}"`)
  else log(`✓ picking header: ${header.replace(/\s+/g, ' ').trim()}`)

  // --- Play out the round to reach the reveal ---
  async function takeTurn(name, queries) {
    if (!(await page.getByRole('heading', { name: new RegExp(`Pick 3 for ${TARGET}`) }).isVisible())) {
      await page.getByRole('button', { name: new RegExp(`I'm ${name}`) }).click()
    }
    for (const q of queries) {
      const s = page.getByPlaceholder('Search a movie title…')
      await s.fill('')
      await s.fill(q)
      await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
      await page.locator('button.fg-card').first().click()
    }
    await page.getByRole('button', { name: /Lock in/ }).click()
  }
  await takeTurn('Ada', ['the matrix', 'inception', 'cats'])
  await takeTurn('Linus', ['interstellar', 'parasite', 'jaws'])

  // --- Reveal shows the custom target, never 160 ---
  await page.getByText(/wins!|It's a tie!/).waitFor({ timeout: 20000 })
  if (!(await page.getByText(`Target ${TARGET}`).first().isVisible()))
    fail(`reveal header did not show "Target ${TARGET}"`)
  else log(`✓ reveal header shows "Target ${TARGET}"`)
  const fromCustom = await page.getByText(new RegExp(`from ${TARGET}`)).count()
  const from160 = await page.getByText(/from 160/).count()
  if (fromCustom < 1) fail(`reveal cards did not mention "from ${TARGET}"`)
  else log(`✓ reveal cards reference "from ${TARGET}" (${fromCustom}×)`)
  if (from160 > 0) fail('reveal still shows the hardcoded 160')
  else log('✓ no stale "from 160" on the reveal')

  // --- Backward compat: an old save with no `target` falls back to 160 ---
  await page.evaluate(() => {
    localStorage.setItem(
      'fresh-guess:game',
      JSON.stringify({
        phase: 'picking',
        currentPlayerIndex: 0,
        players: [{ id: 'p1', name: 'Old', picks: [] }],
      }),
    )
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await settle()
  const legacyHeader = await page.getByRole('heading', { name: /Pick 3 for 160/ })
    .innerText()
    .catch(() => '')
  if (!legacyHeader) fail('legacy save without target did not fall back to 160')
  else log('✓ legacy save (no target) loads and defaults to 160')

  if (errors.length) fail('page errors: ' + errors.join(' | '))
  log(process.exitCode ? '\n✗ target checks finished with failures' : '\n✓ editable target passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
