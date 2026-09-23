/**
 * Captures reference screenshots of the ORIGINAL prototype (the standalone
 * HTML in prototype/original/) for human side-by-side parity review against
 * the new app's VRT baselines. Cross-implementation pixel-diffing is not
 * gated in CI; these images are the review reference.
 *
 * Usage: node tools/capture-prototype-refs.mts
 * Output: tests/reference-prototype/*.png
 */
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium, type Page } from '@playwright/test'

const OUT = 'tests/reference-prototype'
mkdirSync(OUT, { recursive: true })

const url =
  'file://' +
  resolve('prototype/original/Implentio App End to End (standalone).html')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(url)
// The bundler unpacks ~2MB of assets and boots React+Babel.
await page.waitForSelector('text=Parcel Credit Tracker', { timeout: 30000 })
await page.waitForTimeout(1500)

async function snap(name: string) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log(`captured ${name}`)
}

async function scenario(p: Page, value: string) {
  await p.selectOption('select', value)
  await p.waitForTimeout(800)
}

// Default load = tracker (report-ready seeded by the harness default).
await scenario(page, 'report-ready')
await page.getByRole('button', { name: 'Parcel Credit Memos' }).first().click()
await snap('tracker-memos')

await page.getByRole('button', { name: 'Credit Outcomes' }).click()
await snap('tracker-outcomes')

// Memo summary via scenario switch (navigates to the featured memo).
await scenario(page, 'report-ready')
await snap('memo-summary')

await scenario(page, 'updated-v2')
await snap('memo-updated-v2')

await scenario(page, 'all-clear')
await snap('memo-all-clear')

await scenario(page, 'findings-unavailable')
await snap('memo-findings-unavailable')

await scenario(page, 'dispute-finalized')
await snap('memo-dispute-finalized')

// Invoices index and account settings.
await scenario(page, 'report-ready')
await page.getByRole('button', { name: 'Invoices' }).first().click()
await snap('invoices-index')

await page.getByRole('button', { name: /Tori Matthews/ }).first().click()
await page.getByRole('button', { name: 'Account Settings' }).click()
await snap('account')

await browser.close()
console.log('done')
