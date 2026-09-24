import { test, expect } from '@playwright/test'

test('sidebar collapses to the rail and persists the preference', async ({ page }) => {
  await page.goto('/tracker/memos')
  await expect(page.getByRole('link', { name: 'Parcel Credit Memos' })).toBeVisible()
  await page.getByLabel('Collapse navigation').click()
  await expect(page.getByLabel('Expand navigation', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Expand navigation', { exact: true })).toBeVisible()
  await page.getByLabel('Expand navigation', { exact: true }).click()
  await expect(page.getByLabel('Collapse navigation')).toBeVisible()
})

test('harness bar is hidden by default and shown with ?demo=1', async ({ page }) => {
  await page.goto('/tracker/memos')
  await expect(page.getByText('Prototype Harness')).toHaveCount(0)
  await page.goto('/tracker/memos?demo=1')
  await expect(page.getByText('Prototype Harness')).toBeVisible()
  await expect(page.getByLabel('Demo scenario')).toHaveValue('report-ready')
})

test('scenario switch navigates to the scenario location', async ({ page }) => {
  await page.goto('/tracker/memos?demo=1')
  await page.getByLabel('Demo scenario').selectOption('updated-v2')
  await expect(page).toHaveURL(/\/memos\/CM-2026-0531\?scenario=updated-v2/)
})

test('profile menu opens, closes on Escape, and logout shows the signed-out card', async ({
  page,
}) => {
  await page.goto('/tracker/memos')
  const trigger = page.getByRole('button', { name: /Tori Matthews/ })
  await trigger.click()
  await expect(page.getByRole('menuitem', { name: 'Account settings' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menuitem', { name: 'Account settings' })).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await expect(page.getByText(/been signed out/)).toBeVisible()
})
