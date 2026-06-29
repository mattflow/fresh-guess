// Capture a few mobile screenshots of key screens for a visual sanity check.
import { chromium } from 'playwright'
const BASE = 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const settle = () => page.waitForTimeout(1200)

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await settle()
await page.screenshot({ path: '/tmp/fg-landing.png' })

await page.goto(`${BASE}/play`, { waitUntil: 'domcontentloaded' })
await settle()
await page.getByPlaceholder('Player 1 name').fill('Ada')
await page.getByPlaceholder('Player 2 name').fill('Linus')
await page.screenshot({ path: '/tmp/fg-setup.png' })

await page.getByRole('button', { name: /Start game/ }).click()
await page.getByRole('button', { name: /I'm Ada/ }).click()
const search = page.getByPlaceholder('Search a movie title…')
await search.fill('the matrix')
await page.locator('.demo-list-item').first().waitFor({ timeout: 15000 })
await page.locator('.demo-list-item').nth(0).click()
await page.screenshot({ path: '/tmp/fg-picking.png' })

await browser.close()
console.log('screenshots written to /tmp/fg-*.png')
