import { test, expect } from '@playwright/test'

const MEMO = '/memos/CM-2026-0630'

test('memo summary shows rollup and scrolls to a finding', async ({ page }) => {
  await page.goto(MEMO)
  await expect(page.getByRole('heading', { name: 'CM-2026-0630' })).toBeVisible()
  await expect(page.getByText('Variance groups in this credit memo')).toBeVisible()
  await page
    .getByRole('button', { name: 'Packages with base freight as the primary variance driver' })
    .first()
    .click()
  await expect(page.locator('#finding-eg-base')).toBeInViewport()
})

test('finding drill opens service levels and contributing packages', async ({ page }) => {
  await page.goto(MEMO)
  await page.getByRole('button', { name: 'View affected packages' }).first().click()
  await expect(page.getByText('Affected service levels').first()).toBeVisible()
  await page.getByRole('button', { name: 'Show packages' }).first().click()
  await expect(page.getByText('Contributing packages').first()).toBeVisible()
  await expect(page.getByText('Showing 10 of', { exact: false }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Show more packages' }).first().click()
  await expect(page.getByText('Showing 35 of', { exact: false }).first()).toBeVisible()
})

test('dispute wizard manual path marks findings pursued', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-not-started&demo=1`)
  await page.getByRole('button', { name: 'Prepare dispute for Biller' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Prepare for Biller' })).toBeVisible()
  await expect(page.getByText('Review what will be shared with QuickBox')).toBeVisible()
  // All 5 groups selected by default in dispute-not-started? excluded=all → none selected.
  await page.getByRole('button', { name: 'Select all' }).click()
  await page.getByRole('button', { name: 'Continue to email' }).click()
  await expect(page.getByText('Prepare your email to QuickBox')).toBeVisible()
  await expect(page.getByLabel('To', { exact: true })).toHaveValue('billing@quickbox.com')
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  await expect(page.getByText('Your dispute package is ready')).toBeVisible()
  await page.getByRole('button', { name: 'I sent the dispute' }).click()
  await expect(page.getByText('Findings marked pursued with QuickBox.')).toBeVisible()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByText('Track your dispute with QuickBox')).toBeVisible()
  await expect(page.getByText('Sent to QuickBox on', { exact: false }).first()).toBeVisible()
})

test('outcome modal records a partial outcome with validation', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-awaiting&demo=1`)
  await page.getByRole('button', { name: 'Update dispute outcomes' }).first().click()
  await expect(page.getByRole('dialog', { name: 'Update credit memo dispute' })).toBeVisible()
  // Open the first finding's outcome select and pick "Partly collected".
  const outcome = page.getByRole('combobox', { name: /^Outcome for / }).first()
  await outcome.click()
  await page.getByRole('option', { name: 'Partly collected' }).click()
  const amount = page.getByLabel(/Credit received/)
  await amount.fill('999999')
  await expect(page.getByText(/cannot exceed the amount pursued/)).toBeVisible()
  await amount.fill('100')
  await page.getByRole('button', { name: 'Save finding' }).click()
  await expect(outcome).toHaveText(/Partly collected/)
  await page.getByRole('button', { name: 'Done' }).click()
})

test('memo invoices tab filters by metric segments', async ({ page }) => {
  await page.goto(`${MEMO}/invoices`)
  await expect(page.getByText('Invoices in this credit memo')).toBeVisible()
  await expect(page.getByText('Showing 16 of 16 invoices')).toBeVisible()
  await page.getByRole('button', { name: /Variance identified \d+/ }).click()
  await expect(page.getByText(/Showing \d+ of 16 invoices/)).toBeVisible()
})

test('updated-v2 scenario shows the change banner and superseded version', async ({ page }) => {
  await page.goto('/memos/CM-2026-0531?scenario=updated-v2&demo=1')
  await expect(page.getByText('What changed:')).toBeVisible()
  await page.getByRole('link', { name: 'Activity & exports' }).click()
  await expect(page.getByText('Version 1 · Superseded')).toBeVisible()
})
