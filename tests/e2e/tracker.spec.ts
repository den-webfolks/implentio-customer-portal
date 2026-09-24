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

test('outcomes tab slices filter the findings table', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await expect(page.getByText('Showing 9 of 9 findings')).toBeVisible()
  await page.getByRole('button', { name: 'Eligible to pursue $6,527.70', exact: true }).click()
  await expect(page.getByText(/Showing 4 of 9 findings/)).toBeVisible()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(page.getByText('Showing 9 of 9 findings')).toBeVisible()
})

test('a denied finding exposes its reason inline', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await page.getByRole('button', { name: 'View reason' }).click()
  await expect(page.getByText('Why the credit was not issued')).toBeVisible()
  await expect(page.getByText(/contract addendum/)).toBeVisible()
})

test('scenario dispute-finalized changes the golden memo CTA', async ({ page }) => {
  await page.goto('/tracker/memos?scenario=dispute-finalized&demo=1')
  await expect(page.getByText('DISPUTE COMPLETED')).toBeVisible()
  await expect(page.getByRole('button', { name: 'View dispute details' })).toBeVisible()
})
