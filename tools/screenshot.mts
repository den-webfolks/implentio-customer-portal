/**
 * Dev utility: screenshot a URL (defaults to full page).
 * Used for side-by-side parity review against the prototype.
 *
 * Usage: node tools/screenshot.mts <url> <out.png> [width] [height]
 */
import { chromium } from '@playwright/test'

const [url, out, w, h] = process.argv.slice(2)
if (!url || !out) {
  console.error('Usage: node tools/screenshot.mts <url> <out.png> [width] [height]')
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: w ? Number(w) : 1440, height: h ? Number(h) : 900 },
})
await page.goto(url, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: out, fullPage: true })
await browser.close()
console.log(`saved ${out}`)
