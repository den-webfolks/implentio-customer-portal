import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/** Axe scans on every route and key overlay states, desktop and compact width. */
const scan = (page: import('@playwright/test').Page) =>
  new AxeBuilder({ page })
    .analyze()
    .then((r) => r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'))

const ROUTES = [
  '/tracker/memos',
  '/tracker/outcomes',
  '/memos/CM-2026-0630',
  '/memos/CM-2026-0630/invoices',
  '/memos/CM-2026-0630/activity',
  '/invoices',
  '/account',
]

for (const route of ROUTES) {
  test(`axe: ${route}`, async ({ page }) => {
    await page.goto(route)
    await page.waitForLoadState('networkidle')
    expect(await scan(page)).toEqual([])
  })
}

test('axe: review & send open', async ({ page }) => {
  await page.goto('/memos/CM-2026-0630?scenario=dispute-prep-started&demo=1&send=1')
  await expect(page.getByRole('dialog', { name: 'Review & send' })).toBeVisible()
  expect(await scan(page)).toEqual([])
})

test('axe: memo with disputes waiting on the Biller', async ({ page }) => {
  await page.goto('/memos/CM-2026-0630?scenario=dispute-awaiting')
  await page.waitForLoadState('networkidle')
  expect(await scan(page)).toEqual([])
})

test('axe: memo with a close deadline and an expired finding', async ({ page }) => {
  await page.goto('/memos/CM-2026-0630?scenario=dispute-deadline')
  await page.waitForLoadState('networkidle')
  expect(await scan(page)).toEqual([])
})

test('axe: invite modal open', async ({ page }) => {
  await page.goto('/account')
  await page.getByRole('button', { name: 'Invite member' }).click()
  await expect(page.getByRole('dialog', { name: 'Invite team member' })).toBeVisible()
  expect(await scan(page)).toEqual([])
})

test.describe('compact shell (375px)', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  for (const route of ['/tracker/memos', '/memos/CM-2026-0630', '/account']) {
    test(`axe: ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      expect(await scan(page)).toEqual([])
    })
  }

  test('axe: navigation drawer open', async ({ page }) => {
    await page.goto('/tracker/memos')
    await page.getByRole('button', { name: 'Open navigation' }).click()
    await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeVisible()
    expect(await scan(page)).toEqual([])
  })
})
