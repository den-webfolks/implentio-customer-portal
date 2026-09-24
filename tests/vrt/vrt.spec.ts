import { test, expect, type Page } from '@playwright/test'

/**
 * Visual-regression baselines for the new app (CI gates on these).
 * Parity with the prototype is reviewed by humans against the paired
 * reference captures in tests/reference-prototype/ (see tools/
 * capture-prototype-refs.mts) — cross-implementation pixel-diffing is
 * too noisy to gate automatically.
 *
 * Determinism: frozen demo clock, reduced motion (playwright config),
 * animations disabled by toHaveScreenshot, fonts awaited below.
 */

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1000, height: 900 },
  { name: 'phone', width: 480, height: 900 },
] as const

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
}

const SHOT = { fullPage: true, maxDiffPixelRatio: 0.001 } as const

// Core routes at all three viewports.
const CORE: { name: string; url: string }[] = [
  { name: 'tracker-memos', url: '/tracker/memos' },
  { name: 'tracker-outcomes', url: '/tracker/outcomes' },
  { name: 'memo-summary', url: '/memos/CM-2026-0630' },
]

for (const vp of VIEWPORTS) {
  for (const route of CORE) {
    test(`vrt ${route.name} @${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto(route.url)
      await settle(page)
      await expect(page).toHaveScreenshot(`${route.name}-${vp.name}.png`, SHOT)
    })
  }
}

// Secondary routes and scenario states at desktop only.
const DESKTOP_ONLY: { name: string; url: string }[] = [
  { name: 'memo-invoices', url: '/memos/CM-2026-0630/invoices' },
  { name: 'memo-activity', url: '/memos/CM-2026-0630/activity' },
  { name: 'invoices-index', url: '/invoices' },
  { name: 'account', url: '/account' },
  { name: 'memo-processing', url: '/memos/CM-2026-0714' },
  { name: 'memo-updated-v2', url: '/memos/CM-2026-0531?scenario=updated-v2' },
  { name: 'memo-all-clear', url: '/memos/CM-2026-0801?scenario=all-clear' },
  { name: 'memo-findings-unavailable', url: '/memos/CM-2026-0630?scenario=findings-unavailable' },
  { name: 'memo-dispute-finalized', url: '/memos/CM-2026-0630?scenario=dispute-finalized' },
  { name: 'tracker-dispute-recorded', url: '/tracker/memos?scenario=dispute-recorded' },
  { name: 'memo-dispute-deadline', url: '/memos/CM-2026-0630?scenario=dispute-deadline' },
  { name: 'memo-dispute-awaiting', url: '/memos/CM-2026-0630?scenario=dispute-awaiting' },
]

for (const route of DESKTOP_ONLY) {
  test(`vrt ${route.name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(route.url)
    await settle(page)
    await expect(page).toHaveScreenshot(`${route.name}-desktop.png`, SHOT)
  })
}

// Overlay states at desktop.
test('vrt review & send', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/memos/CM-2026-0630?scenario=dispute-prep-started&demo=1&send=1')
  await settle(page)
  await expect(page.getByRole('dialog', { name: 'Review & send' })).toBeVisible()
  await expect(page).toHaveScreenshot('review-send-desktop.png', { maxDiffPixelRatio: 0.001 })
})

test('vrt package view', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/memos/CM-2026-0630')
  await settle(page)
  await page.locator('#finding-eg-base').getByRole('button', { name: 'Show me why' }).click()
  await page.locator('#finding-eg-base').getByRole('button', { name: /^See all/ }).click()
  await expect(page.getByRole('dialog', { name: /^All 510 packages/ })).toBeVisible()
  await expect(page).toHaveScreenshot('package-view-desktop.png', { maxDiffPixelRatio: 0.001 })
})

test('vrt invite modal', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/account')
  await settle(page)
  await page.getByRole('button', { name: 'Invite member' }).click()
  await expect(page.getByRole('dialog', { name: 'Invite team member' })).toBeVisible()
  await expect(page).toHaveScreenshot('invite-modal-desktop.png', { maxDiffPixelRatio: 0.001 })
})

test('vrt collapsed rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tracker/memos')
  await settle(page)
  await page.getByLabel('Collapse navigation').click()
  await expect(page.getByLabel('Expand navigation', { exact: true })).toBeVisible()
  await expect(page).toHaveScreenshot('collapsed-rail-desktop.png', { maxDiffPixelRatio: 0.001 })
})
