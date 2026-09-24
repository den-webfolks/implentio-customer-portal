import { test, expect } from '@playwright/test'

test('invoices index searches, filters, and links to memos', async ({ page }) => {
  await page.goto('/invoices')
  await expect(page.getByText('Showing 20 of 20 invoices')).toBeVisible()

  await page.getByPlaceholder('Search invoice number').fill('QS3098017')
  await expect(page.getByText('Showing 1 of 20 invoices')).toBeVisible()
  await page.getByPlaceholder('Search invoice number').fill('')

  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Parcel review status' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Audit not complete' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('Showing 1 of 20 invoices')).toBeVisible()
  await expect(page.getByRole('table').getByText('Audit not complete', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove Parcel review status filter' }).click()
  await expect(page.getByText('Showing 20 of 20 invoices')).toBeVisible()

  await page.getByRole('link', { name: 'CM-2026-0630 →' }).first().click()
  await expect(page).toHaveURL(/\/memos\/CM-2026-0630$/)
})
