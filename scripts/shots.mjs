// Capture mobile screenshots of key screens (light + dark, peek on).
import { chromium } from 'playwright'
const BASE = 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
const settle = (p) => p.waitForTimeout(1200)

async function shot(colorScheme, name, drive) {
  const ctx = await browser.newContext({ colorScheme, viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await settle(page)
  await drive(page)
  await page.screenshot({ path: `/tmp/fg-${name}.png` })
  await ctx.close()
}

// Light-mode setup screen
await shot('light', 'light-setup', async (page) => {
  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByPlaceholder('Player 2 name').fill('Linus')
})

// Dark-mode picking screen with Peek scores ON
await shot('dark', 'dark-peek', async (page) => {
  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByPlaceholder('Player 2 name').fill('Linus')
  await page.getByRole('button', { name: /Start game/ }).click()
  await page.getByRole('button', { name: /I'm Ada/ }).click()
  await page.getByRole('button', { name: /Peek scores/ }).click()
  await page.getByPlaceholder('Search a movie title…').fill('the matrix')
  await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
  await page.locator('.fg-pill', { hasText: '%' }).first().waitFor({ timeout: 10000 })
  await page.locator('button.fg-card').first().click()
})

// Dark-mode compact picking screen: chip strip (2 of 3 picked) + live results,
// showing the keyboard-aware layout (pinned chrome, scrolling results, pinned Lock-in).
await shot('dark', 'compact-picking', async (page) => {
  await page.getByRole('button', { name: 'Remove player 2' }).click()
  await page.getByPlaceholder('Player 1 name').fill('Ada')
  await page.getByRole('button', { name: /Play solo/ }).click()
  for (const q of ['the matrix', 'inception']) {
    const s = page.getByPlaceholder('Search a movie title…')
    await s.fill('')
    await s.fill(q)
    await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
    await page.locator('button.fg-card').first().click()
  }
  // Leave a query so both the chip strip and result rows are visible in the shot.
  await page.getByPlaceholder('Search a movie title…').fill('jaws')
  await page.locator('button.fg-card').first().waitFor({ timeout: 15000 })
})

await browser.close()
console.log('screenshots: /tmp/fg-light-setup.png, /tmp/fg-dark-peek.png, /tmp/fg-compact-picking.png')
