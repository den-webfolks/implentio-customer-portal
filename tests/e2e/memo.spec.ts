import { test, expect } from '@playwright/test'

const MEMO = '/memos/CM-2026-0630'

test('tick a finding, review & send by downloaded email, then it waits on the Biller', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=report-ready&demo=1`)
  await page.getByRole('checkbox', { name: /^Include in dispute: Shipping price/ }).click()
  const bar = page.getByRole('region', { name: 'Selected for your dispute' })
  await expect(bar.getByText('1 finding · $9,322.20 selected')).toBeVisible()
  await bar.getByRole('button', { name: 'Review & send' }).click()
  const dialog = page.getByRole('dialog', { name: 'Review & send' })
  await expect(dialog.getByLabel('To', { exact: true })).toHaveValue('billing@quickbox.com')
  await dialog.getByRole('button', { name: 'Download email' }).click()
  await dialog.getByRole('button', { name: 'I sent it' }).click()
  await expect(dialog.getByText('Dispute recorded as sent to QuickBox')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('region', { name: /^QuickBox dispute/ }).getByText('Waiting on Biller')).toBeVisible()
  await expect(page.locator('#finding-eg-fuel').getByText('Dispute by September 20, 2026 · 3 days remaining')).toBeVisible()
})

test('answers are recorded finding by finding on each dispute card', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-awaiting&demo=1`)
  const answer = (dispute: string, finding: string) =>
    page.getByRole('region', { name: dispute }).getByRole('group', { name: `Answer for ${finding}` }).getByRole('radio', { name: 'Fully collected' })
  await answer('QuickBox dispute, Sep 15, 2026', 'Home-delivery fee charged incorrectly').click()
  for (const finding of [
    'Shipping price higher than your contract rate',
    'Fuel charge higher than your contract allows',
    'Remote-area fee charged incorrectly',
    'Shipping price and fuel charge both too high',
  ])
    await answer('QuickBox dispute, Sep 8, 2026', finding).click()
  await expect(page.getByText('Every finding has a final outcome.')).toBeVisible()
})

test('a whole-memo dispute is sent and completed', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=findings-unavailable&demo=1`)
  await page.getByRole('region', { name: 'Summary' }).getByRole('button', { name: 'Review & send' }).click()
  const dialog = page.getByRole('dialog', { name: 'Review & send' })
  await dialog.getByRole('button', { name: 'Download email' }).click()
  await dialog.getByRole('button', { name: 'I sent it' }).click()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByText('Waiting on Biller', { exact: true }).first()).toBeVisible()
  await page.getByRole('group', { name: 'Answer for Complete credit memo' }).getByRole('radio', { name: 'Fully collected' }).click()
  await expect(page.getByText('Every finding has a final outcome.')).toBeVisible()
})

test('a finding can be marked not pursued and undone', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=report-ready&demo=1`)
  const das = page.locator('#finding-eg-das')
  await page.locator('#findings').getByRole('button', { name: /^Show 3 smaller findings/ }).click()
  await das.getByRole('button', { name: /^Won’t pursue/ }).click()
  await expect(das.getByText('Won’t pursue', { exact: true })).toBeVisible()
  await expect(das.getByRole('checkbox')).toHaveCount(0)
  await das.getByRole('button', { name: /^Undo/ }).click()
  await expect(das.getByText('Ready to dispute', { exact: true })).toBeVisible()
})

test('a link to the dispute record scrolls to the dispute cards with what was sent', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=report-downloaded&demo=1&dispute=1`)
  const sep8 = page.getByRole('region', { name: 'QuickBox dispute, Sep 8, 2026' })
  await expect(page.locator('#disputes')).toBeInViewport()
  await expect(page.getByRole('region', { name: 'QuickBox dispute, Sep 15, 2026' })).toBeVisible()
  await expect(sep8.getByText('CM-2026-0630-Version-1-Selected-Variance-Evidence.zip')).toBeVisible()
  await expect(page).not.toHaveURL(/dispute=1/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('outcomes appear in the memo activity', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-awaiting&demo=1`)
  const card = page.getByRole('region', { name: 'QuickBox dispute, Sep 15, 2026' })
  await card.getByRole('radio', { name: 'Denied' }).click()
  await page.getByRole('navigation', { name: 'Credit memo sections' }).getByRole('link', { name: 'Activity & exports' }).click()
  await expect(page.getByText(/^Outcome recorded — .*: Denied$/)).toBeVisible()
})

test('a close deadline needs action and a passed one shows Expired', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-deadline&demo=1`)
  await expect(page.getByText('Action needed', { exact: true })).toBeVisible()
  await page.locator('#findings').getByRole('button', { name: /smaller finding/ }).click()
  await expect(page.getByText('Dispute by September 19, 2026 · 2 days remaining').first()).toBeVisible()
  const multi = page.locator('#finding-eg-multi')
  await expect(multi.getByText('Expired', { exact: true })).toBeVisible()
  await expect(multi.getByText(/Dispute window closed September 15, 2026/)).toBeVisible()
})

test('a partial credit asks for a valid amount', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-awaiting&demo=1`)
  const card = page.getByRole('region', { name: 'QuickBox dispute, Sep 15, 2026' })
  await card.getByRole('radio', { name: 'Partly collected' }).click()
  const amount = card.getByRole('textbox', { name: /^Amount collected/ })
  await expect(amount).toBeFocused()
  await amount.fill('999999')
  await expect(card.getByText('Up to $22.64')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Save' })).toBeDisabled()
  await amount.fill('10')
  await card.getByRole('button', { name: 'Save' }).click()
  await expect(card.getByText('Partly collected', { exact: true })).toBeVisible()
  await expect(card.getByText(/\$10\.00 collected/)).toBeVisible()
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
