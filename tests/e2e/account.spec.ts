import { test, expect } from '@playwright/test'

test('account page shows profile, team, contacts, and integrations', async ({ page }) => {
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Account Settings' })).toBeVisible()
  await expect(page.getByText('tori@implentio.com').first()).toBeVisible()
  await expect(page.getByText('Renee Alvarez')).toBeVisible()
  await expect(page.getByText('Dana Reyes')).toBeVisible()
  await expect(page.getByText('Shopify')).toBeVisible()
})

test('invite member validates and adds an invited member', async ({ page }) => {
  await page.goto('/account')
  await page.getByRole('button', { name: 'Invite member' }).click()
  await page.getByRole('button', { name: 'Send invite' }).click()
  await expect(page.getByText('Enter the member’s full name.')).toBeVisible()
  await page.getByPlaceholder('Jordan Lee').fill('Jordan Lee')
  await page.getByPlaceholder('jordan@company.com').fill('not-an-email')
  await page.getByRole('button', { name: 'Send invite' }).click()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await page.getByPlaceholder('jordan@company.com').fill('jordan@company.com')
  await page.getByRole('button', { name: 'Send invite' }).click()
  await expect(page.getByText('Jordan Lee')).toBeVisible()
  await expect(page.getByText('Invited').nth(1)).toBeVisible()
})

test('email connect flow simulates OAuth and expiry', async ({ page }) => {
  await page.goto('/account')
  await page.getByRole('button', { name: 'Connect', exact: true }).first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('Connected', { exact: true }).nth(1)).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Send email')).toBeVisible()
  await page.getByRole('button', { name: 'Preview: simulate token expiration' }).click()
  await expect(page.getByText('Reconnect required')).toBeVisible()
})

test('biller contact edit enforces default dispute contact uniqueness copy', async ({ page }) => {
  await page.goto('/account')
  await page
    .locator('div')
    .filter({ has: page.getByText('Dana Reyes') })
    .getByRole('button', { name: 'Edit' })
    .last()
    .click()
  await expect(page.getByRole('dialog', { name: 'Edit Biller contact' })).toBeVisible()
  await expect(page.getByText(/replaces any other default/)).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
})
