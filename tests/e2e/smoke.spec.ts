import { test, expect } from '@playwright/test'

test('root redirects to the tracker memos tab', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/tracker\/memos$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Parcel Credit Tracker')
})
