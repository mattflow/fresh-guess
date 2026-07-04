// Verify the peek-scores button and system-driven light/dark theming. Requires `pnpm dev`.
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const log = (...a) => console.log(...a)
const fail = (m) => {
  console.error('✗ FAIL:', m)
  process.exitCode = 1
}
const settle = () => page.waitForTimeout(1200)

const browser = await chromium.launch({ headless: true })
// Default the OS preference to dark so we can confirm "system" follows it.
const page = await (
  await browser.newContext({ colorScheme: 'dark', viewport: { width: 390, height: 844 } })
).newPage()

const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
const themeAttr = () =>
  page.evaluate(() => document.documentElement.getAttribute('data-theme'))

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle()

  // ---- Theme: no selector, always follows the OS prefers-color-scheme ----
  // No manual theme toggle should exist anymore.
  if ((await page.locator('button[aria-label^="Theme:"]').count()) !== 0)
    fail('theme toggle button should have been removed')
  // Never sets an explicit data-theme override — theming is purely media-query driven.
  if ((await themeAttr()) !== null) fail('expected no data-theme attr (system only)')
  const darkBg = await bg()
  log('✓ no theme selector; dark OS preference → dark body bg', darkBg)

  // A fresh context with a light OS preference should render the light palette.
  const lightCtx = await browser.newContext({
    colorScheme: 'light',
    viewport: { width: 390, height: 844 },
  })
  const lightPage = await lightCtx.newPage()
  await lightPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await lightPage.waitForTimeout(1200)
  const lightAttr = await lightPage.evaluate(() =>
    document.documentElement.getAttribute('data-theme'),
  )
  const lightBg = await lightPage.evaluate(() => getComputedStyle(document.body).backgroundColor)
  if (lightAttr !== null) fail('light context should also have no data-theme attr')
  if (lightBg === darkBg) fail('light OS preference did not change the body background')
  log('✓ light OS preference → light body bg', lightBg)
  await lightCtx.close()

  // ---- Peek scores: hidden by default, button reveals %, hide button hides ----
  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByPlaceholder('Player 2 name').fill('Linus')
  await page.getByRole('button', { name: /Start game/ }).click()
  await page.getByRole('button', { name: /I'm Ada/ }).click()

  await page.getByPlaceholder('Search a movie title…').fill('the matrix')
  await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })

  const pctVisible = () =>
    page.locator('.fg-pill').filter({ hasText: '%' }).count()

  if ((await pctVisible()) !== 0) fail('scores visible before peeking — should be hidden')
  log('✓ scores hidden by default')

  await page.getByRole('button', { name: /Peek scores/ }).click()
  // wait for at least one % badge to load
  await page.locator('.fg-pill', { hasText: '%' }).first().waitFor({ timeout: 10000 })
  const peekCount = await pctVisible()
  if (peekCount < 1) fail('no scores shown after pressing Peek')
  log(`✓ Peek revealed ${peekCount} score badge(s)`)

  // pick one movie and confirm running total appears
  await page.locator('button.fg-card').first().click()
  const totalText = await page.locator('text=/\\/ 160/').first().innerText().catch(() => '')
  if (!/\/\s*160/.test(totalText)) fail('running total "/ 160" not shown while peeking')
  else log('✓ running total shown while peeking:', totalText.replace(/\s+/g, ' ').trim())

  await page.getByRole('button', { name: /Hide scores/ }).click()
  if ((await pctVisible()) !== 0) fail('scores still visible after Hide')
  log('✓ Hide scores re-hides them')

  log(process.exitCode ? '\n✗ feature checks finished with failures' : '\n✓ feature checks passed')
} catch (e) {
  fail(e.message)
} finally {
  await browser.close()
}
