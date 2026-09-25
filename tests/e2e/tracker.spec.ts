import { test, expect } from '@playwright/test'

const row = (page: import('@playwright/test').Page, id: string) => page.locator(`#memo-row-${id}`)
const details = (page: import('@playwright/test').Page, id: string) => page.getByRole('link', { name: `Check details for ${id}` })

test('the summary adds up the rows, and the list puts most left to dispute first', async ({ page }) => {
  await page.goto('/tracker/memos')
  const summary = page.getByRole('region', { name: 'Where your money is' })
  await expect(summary.getByText('$49,513.43')).toBeVisible()
  await expect(summary.getByText(/overcharged across 6 credit memos/)).toBeVisible()
  await expect(summary.getByText('$19,075.62')).toBeVisible()
  await expect(summary.getByText('$9,410.11')).toBeVisible()
  await expect(summary.getByText('80.7%')).toBeVisible()
  await expect(summary.getByText('$9,327.70')).toBeVisible()
  await expect(page.getByRole('heading', { name: '7 credit memos · 1 with no overcharges' })).toBeVisible()
  await expect(page.getByText(/^Audit in progress: CM-2026-0714/)).toBeVisible()
  await expect(page.locator('article h3')).toHaveText(['CM-2026-0630', 'CM-2026-0531', 'CM-2026-0514', 'CM-2026-0430', 'CM-2026-0517', 'CM-2026-0328'])

  // The big number always means the same thing: left to dispute.
  await expect(page.locator('article').getByText('Left to dispute', { exact: true })).toHaveCount(6)
  await expect(row(page, 'CM-2026-0630').getByText('Not disputed yet')).toBeVisible()
  await expect(row(page, 'CM-2026-0630').getByText('Dispute by Sep 20, 2026 · 3 days remaining')).toBeVisible()
  // Everything sent: $0.00 left, the rest once each, and the active dispute.
  const waiting = row(page, 'CM-2026-0517')
  await expect(waiting.getByText('$0.00', { exact: true })).toBeVisible()
  await expect(waiting.getByText('of $22,250.00 overcharged')).toBeVisible()
  await expect(waiting.getByRole('list', { name: 'The rest of this memo' }).getByRole('listitem')).toHaveText([
    '$2,700.00 waiting',
    '$11,700.00 recovered',
    '$2,800.00 not recovered',
    '$5,050.00 not disputed',
  ])
  await expect(waiting.getByText('Active dispute')).toBeVisible()
  await expect(waiting.getByText('Sent Aug 22, 2026 · 26 days ago')).toBeVisible()
  // One button on every row, landing on the memo's next step.
  await expect(page.getByRole('link', { name: /^Check details for / })).toHaveCount(6)
  await expect(details(page, 'CM-2026-0517')).toHaveAttribute('href', '/memos/CM-2026-0517?outcomes=1')
  await expect(details(page, 'CM-2026-0630')).toHaveAttribute('href', '/memos/CM-2026-0630?findings=1')
  await expect(page.getByText('Demo placeholder', { exact: true })).toHaveCount(0)
})

test('the summary total matches Credit outcomes, in the same words', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await expect(page.getByRole('button', { name: 'Total identified $49,513.43', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Left to dispute $19,075.62', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recovered $11,700.00', exact: true })).toBeVisible()
})

test('the summary buttons take you to the first memo that needs that job', async ({ page }) => {
  await page.goto('/tracker/memos')
  const summary = page.getByRole('region', { name: 'Where your money is' })
  await summary.getByRole('button', { name: 'Record answers' }).click()
  await expect(row(page, 'CM-2026-0430').getByRole('link', { name: 'CM-2026-0430', exact: true })).toBeFocused()
  await summary.getByRole('button', { name: 'Review overcharges' }).click()
  await expect(row(page, 'CM-2026-0630').getByRole('link', { name: 'CM-2026-0630', exact: true })).toBeFocused()
})

test('tracker filters narrow the list and the summary together', async ({ page }) => {
  await page.goto('/tracker/memos')
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Biller' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'ShipBob' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: '3 credit memos', exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Where your money is' }).getByText(/overcharged across 3 credit memos/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'CM-2026-0630' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Remove Biller filter' }).click()
  await expect(page.getByRole('heading', { name: '7 credit memos · 1 with no overcharges' })).toBeVisible()
})

test('the list can sort by the soonest deadline', async ({ page }) => {
  await page.goto('/tracker/memos')
  await page.getByRole('combobox', { name: 'Sort credit memos' }).click()
  await page.getByRole('option', { name: 'Soonest deadline first' }).click()
  await expect(page.locator('article h3')).toHaveText(['CM-2026-0531', 'CM-2026-0630', 'CM-2026-0514', 'CM-2026-0517', 'CM-2026-0328', 'CM-2026-0430'])
})

test('Finished is collapsed and opens by itself when it is all that is left', async ({ page }) => {
  await page.goto('/tracker/memos')
  const done = page.getByRole('button', { name: 'Finished (1)' })
  await expect(done).toHaveAttribute('aria-expanded', 'false')
  await expect(row(page, 'CM-2026-0801')).toHaveCount(0)
  await done.click()
  await expect(row(page, 'CM-2026-0801').getByText('No overcharges found')).toBeVisible()
  await expect(row(page, 'CM-2026-0801').getByText('32 invoices audited')).toBeVisible()

  await page.goto('/tracker/memos')
  await page.getByRole('button', { name: 'Filter', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Biller' }).click()
  await page.getByRole('menuitemcheckbox', { name: 'Rumpl' }).click()
  await page.keyboard.press('Escape')
  await expect(row(page, 'CM-2026-0801')).toBeVisible()
})

test('outcomes tab covers every memo and its slices filter the findings table', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await expect(page.getByText('Showing 22 of 22 findings')).toBeVisible()
  await page.getByRole('button', { name: 'Left to dispute $19,075.62', exact: true }).click()
  await expect(page.getByText(/Showing 11 of 22 findings/)).toBeVisible()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await page.getByRole('button', { name: 'Not disputed $6,527.70', exact: true }).click()
  await expect(page.getByText(/Showing 4 of 22 findings/)).toBeVisible()
})

test('a memo with a close deadline shows the prototype countdown and opens on its findings', async ({ page }) => {
  await page.goto('/tracker/memos?scenario=dispute-deadline&demo=1')
  const r = row(page, 'CM-2026-0630')
  await expect(r.getByText('Dispute by Sep 19, 2026 · 2 days remaining')).toBeVisible()
  await details(page, 'CM-2026-0630').click()
  await expect(page).toHaveURL(/\/memos\/CM-2026-0630$/)
  await expect(page.getByRole('heading', { name: 'Findings', exact: true })).toBeFocused()
})

test('Check details on a waiting memo lands on the dispute that has waited longest', async ({ page }) => {
  await page.goto('/tracker/memos?scenario=dispute-awaiting&demo=1')
  await details(page, 'CM-2026-0630').click()
  await expect(page.getByRole('heading', { name: 'Dispute sent to QuickBox · Sep 8, 2026' })).toBeFocused()
})

test('a denied finding exposes its reason inline', async ({ page }) => {
  await page.goto('/tracker/outcomes')
  await page.getByRole('button', { name: 'View reason' }).click()
  await expect(page.getByText('Why the Biller declined')).toBeVisible()
  await expect(page.getByText(/contract addendum/)).toBeVisible()
})

test('scenario dispute-finalized moves the golden memo to Finished, closed, with what came back', async ({ page }) => {
  await page.goto('/tracker/memos?scenario=dispute-finalized&demo=1')
  await page.getByRole('button', { name: /^Finished/ }).click()
  const r = row(page, 'CM-2026-0630')
  await expect(r.getByText('Closed', { exact: true })).toBeVisible()
  await expect(r.getByText('$9,383.02')).toBeVisible()
  await details(page, 'CM-2026-0630').click()
  await expect(page.locator('#disputes')).toBeInViewport()
})
