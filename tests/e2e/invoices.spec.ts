import { test, expect } from '@playwright/test'

test('invoices index searches, filters, and links to memos', async ({ page }) => {
  await page.goto('/invoices')
  await expect(page.getByText('Showing 20 of 20 invoices')).toBeVisible()

  await page.getByPlaceholder('Search invoice number').fill('QS3098017')
  await expect(page.getByText('Showing 1 of 20 invoices')).toBeVisible()
  await page.getByPlaceholder('Search invoice number').fill('')

  await page.getByRole('button', { name: /Filters/ }).click()
  const panel = page.getByRole('dialog', { name: 'Filters' })
  await panel.getByRole('combobox').nth(2).selectOption('pending')
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page.getByText('Showing 1 of 20 invoices')).toBeVisible()
  await expect(page.getByText('Audit not complete')).toBeVisible()
  await page.getByRole('button', { name: 'Remove filter' }).click()

  await page.getByRole('button', { name: 'CM-2026-0630 →' }).first().click()
  await expect(page).toHaveURL(/\/memos\/CM-2026-0630$/)
})
