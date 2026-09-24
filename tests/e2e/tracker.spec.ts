import { test, expect } from '@playwright/test'

test('memos tab renders the executive summary and all memo cards', async ({ page }) => {
  await page.goto('/tracker/memos')
  await expect(page.getByText('Executive summary')).toBeVisible()
  await expect(page.getByText('$40,125.73')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CM-2026-0630' })).toBeVisible()
  await expect(page.getByText('8 credit memos', { exact: true })).toBeVisible()
})

test('tracker filters narrow the memo list immediately (Figma filter group)', async ({ page }) => {
  await page.goto('/tracker/memos')
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Biller' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'ShipBob' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('3 credit memos', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CM-2026-0630' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Remove Biller filter' }).click()
  await expect(page.getByText('8 credit memos', { exact: true })).toBeVisible()
})

test('outcomes tab covers every memo and its slices filter the findings table', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await expect(page.getByText('Showing 14 of 14 findings')).toBeVisible()
  await page.getByRole('button', { name: 'Ready to dispute $9,387.70', exact: true }).click()
  await expect(page.getByText(/Showing 5 of 14 findings/)).toBeVisible()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await page.getByRole('button', { name: 'Not disputed $6,527.70', exact: true }).click()
  await expect(page.getByText(/Showing 4 of 14 findings/)).toBeVisible()
})

test('outcomes tab flags findings that need an update', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await expect(page.getByText('2 findings need your update')).toBeVisible()
  await page.getByRole('button', { name: 'Show them' }).click()
  await expect(page.getByText(/Showing 2 of 14 findings/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Record outcome' })).toHaveCount(2)
})

test('credits realized sums the outcomes the team recorded', async ({ page }) => {
  await page.goto('/tracker/memos')
  await expect(page.getByText('$11,700.00')).toBeVisible()
  await expect(page.getByText('Recorded by your team')).toBeVisible()
})

test('a memo with a close deadline shows Action needed and the deadline', async ({ page }) => {
  await page.goto('/tracker/memos?scenario=dispute-deadline&demo=1')
  const card = page.locator('#memo-card-CM-2026-0630')
  await expect(card.getByText('Action needed', { exact: true })).toBeVisible()
  await expect(card.getByText('Dispute by Sep 19, 2026 · 2 days remaining')).toBeVisible()
})

test('a denied finding exposes its reason inline', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await page.getByRole('button', { name: 'View reason' }).click()
  await expect(page.getByText('Why the Biller declined')).toBeVisible()
  await expect(page.getByText(/contract addendum/)).toBeVisible()
})

test('scenario dispute-finalized changes the golden memo CTA', async ({ page }) => {
  await page.goto('/tracker/memos?scenario=dispute-finalized&demo=1')
  const card = page.locator('#memo-card-CM-2026-0630')
  await expect(card.getByText('Done', { exact: true })).toBeVisible()
  await card.getByRole('link', { name: 'View dispute details' }).click()
  await expect(page.locator('#disputes')).toBeInViewport()
})
