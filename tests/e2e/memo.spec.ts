import { test, expect } from '@playwright/test'

const MEMO = '/memos/CM-2026-0630'

// Copy buttons write to the clipboard; the handoff is recorded only when that works.
test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

const DIALOG = /^Dispute with QuickBox/

/** Selects the whole email preview and copies it with Cmd/Ctrl+C. */
const copyEmail = async (page: import('@playwright/test').Page) => {
  await page.evaluate(() => {
    const el = document.querySelector('[class*="emailBody"]')
    if (!el) throw new Error('no email body')
    window.getSelection()?.selectAllChildren(el)
  })
  await page.keyboard.press('ControlOrMeta+c')
}

test('tick a finding, walk the three steps, open the email in a mail app, confirm it was sent', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=report-ready&demo=1`)
  await page.getByRole('checkbox', { name: /^Include in dispute: Shipping price/ }).click()
  const bar = page.getByRole('region', { name: 'Selected for your dispute' })
  await expect(bar.getByText('1 finding · $9,322.20 selected')).toBeVisible()
  await bar.getByRole('button', { name: 'Review & send' }).click()
  const dialog = page.getByRole('dialog', { name: DIALOG })
  // Step 1: the selection, with what's left out.
  await expect(dialog.getByText('Total you’re claiming: $9,322.20')).toBeVisible()
  await expect(dialog.getByText(/4 other findings \(\$65\.50\) are not included/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Next: check the email' }).click()
  // Step 2: recipients from the Biller contact, then the email; it names its file, and the file previews.
  await expect(dialog.getByRole('heading', { name: 'Check the email — nothing is sent yet' })).toBeFocused()
  await expect(dialog.getByLabel('To', { exact: true })).toHaveValue('billing@quickbox.com')
  await expect(dialog.getByText(/You're asking QuickBox for \$9,322\.20 back for 1 overcharge/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Base-Freight.csv', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Base-Freight.csv' })
  await expect(preview.getByText('… 498 more in the file')).toBeVisible()
  await expect(preview.getByRole('button', { name: /Download/ })).toHaveCount(0)
  await preview.getByRole('button', { name: 'Close', exact: true }).last().click()
  // The wording is editable in place; the evidence is locked until asked.
  const evidence = dialog.getByRole('region', { name: 'Evidence from your audit' })
  await expect(evidence.getByText('Locked so the amounts and file names match the attached files.')).toBeVisible()
  await expect(evidence.getByRole('textbox')).toHaveCount(0)
  await dialog.getByRole('textbox', { name: 'Opening' }).fill('Hi Dana,\n\nWe found charges that don’t match our contract.')
  await evidence.getByRole('button', { name: 'More details' }).click()
  await expect(evidence.getByText(/^Billed \$[\d,.]+ · your contract \$[\d,.]+ · difference \$9,322\.20/)).toBeVisible()
  await evidence.getByRole('button', { name: 'Edit evidence' }).click()
  await expect(dialog.getByRole('textbox', { name: 'Evidence' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  // Step 3: the summary, then the manual checklist.
  await expect(dialog.getByText('Base-Freight.csv · Summary.pdf')).toBeVisible()
  await dialog.getByRole('button', { name: 'Continue manually' }).click()
  const zip = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download all files (.zip)' }).click()
  expect((await zip).suggestedFilename()).toBe('CM-2026-0630 dispute files.zip')
  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Download the email (.eml) — files attached' }).click()
  expect((await download).suggestedFilename()).toBe('CM-2026-0630 dispute email.eml')
  // The email left the app: the last step now ends with "I sent it".
  await dialog.getByRole('button', { name: 'I sent it', exact: true }).click()
  await expect(dialog.getByText('Sent and recorded — QuickBox dispute')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('region', { name: /^QuickBox dispute/ }).getByText('Waiting on Biller')).toBeVisible()
  await expect(page.locator('#finding-eg-fuel').getByText('Dispute by September 20, 2026 · 3 days remaining')).toBeVisible()
})

test('a connected mailbox sends in one click and the request shows as submitted', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prep-started&demo=1&send=1`)
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await dialog.getByRole('button', { name: 'Next: check the email' }).click()
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await expect(dialog.getByText('Recommended')).toBeVisible()
  await dialog.getByRole('button', { name: 'Connect Gmail' }).click()
  await expect(dialog.getByText('Gmail · tori@implentio.com')).toBeVisible()
  await dialog.getByRole('button', { name: 'Send dispute' }).click()
  await expect(dialog.getByText('Request submitted to QuickBox from tori@implentio.com')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('region', { name: 'QuickBox dispute, Sep 17, 2026' })).toBeVisible()
})

test('step 2 checks the recipients on Next, and Edit links land on the field', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prep-started&demo=1&send=1`)
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await dialog.getByRole('button', { name: 'Next: check the email' }).click()
  const to = dialog.getByLabel('To', { exact: true })
  await to.fill('billing@quickbox')
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await expect(dialog.getByText('“billing@quickbox” isn’t an email address.')).toBeVisible()
  await expect(to).toBeFocused()
  await to.fill('billing@quickbox.com')
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await dialog.getByRole('button', { name: 'Edit the subject' }).click()
  await expect(dialog.getByLabel('Subject', { exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await dialog.getByRole('button', { name: 'Edit recipients' }).click()
  await expect(to).toBeFocused()
})

test('a half-typed address is never saved as the Biller contact, even when the email is copied', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prep-started&demo=1&send=1`)
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await dialog.getByRole('button', { name: 'Next: check the email' }).click()
  await dialog.getByLabel('To', { exact: true }).fill('dana@quickbox')
  await dialog.getByRole('checkbox', { name: /Save this address/ }).check()
  // A selection dragged from the header into the body still counts, and copies the whole email.
  await page.evaluate(() => {
    const from = document.querySelector('[class*="compose"]')
    const to = document.querySelector('[class*="emailBody"]')
    if (!from || !to) throw new Error('missing')
    const range = document.createRange()
    range.setStartBefore(from)
    range.setEndAfter(to)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  await page.keyboard.press('ControlOrMeta+c')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^Hi Dana Reyes,[\s\S]*Tori Matthews$/)
  await expect(dialog.getByText(/We saved this email as prepared/)).toBeVisible()
  // The review step points back to the bad address, until it's fixed.
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await expect(dialog.getByLabel('To', { exact: true })).toBeFocused()
  await dialog.getByLabel('To', { exact: true }).fill('dana@quickbox.com')
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await expect(dialog.getByRole('heading', { name: 'Review & send' })).toBeVisible()
  await expect(dialog.getByText('The email left the app before its recipients were complete.')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page.getByRole('dialog', { name: /^Before you go/ }).getByRole('button', { name: 'Not yet' }).click()
  await page.getByRole('region', { name: /^Email to QuickBox prepared/ }).getByRole('link', { name: 'Connect Gmail or Outlook' }).click()
  await expect(page.getByText('billing@quickbox.com').first()).toBeVisible()
  await expect(page.getByText('dana@quickbox', { exact: true })).toHaveCount(0)
})

test('copying the email at step 2 prepares the dispute; closing asks; the tracker asks again', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prep-started&demo=1&send=1`)
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await dialog.getByRole('button', { name: 'Next: check the email' }).click()
  await copyEmail(page)
  // A copy that spans the greeting gets the whole email, not the page text.
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/^Hi Dana Reyes,[\s\S]*1\) Shipping price[\s\S]*Thank you,\nTori Matthews$/)
  await expect(dialog.getByText('We saved this email as prepared. When you’ve sent it to QuickBox, come back and choose “I sent it”.')).toBeVisible()
  await page.keyboard.press('Escape')
  const guard = page.getByRole('dialog', { name: 'Before you go: did you send the email to QuickBox?' })
  await expect(guard).toBeVisible()
  await guard.getByRole('button', { name: 'Not yet' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // The memo page keeps asking, and the findings are reserved.
  const card = page.getByRole('region', { name: /^Email to QuickBox prepared/ })
  await expect(card.getByRole('heading', { name: /prepared Sep 17, 2026 by you — not confirmed as sent/ })).toBeVisible()
  await expect(page.locator('#finding-eg-base').getByText('In a prepared email', { exact: true })).toBeVisible()
  await expect(page.locator('#finding-eg-base').getByRole('checkbox')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Selected for your dispute' })).toHaveCount(0)
  // The tracker shows it, and Check details lands on the prepared card (no dialog).
  await page.getByRole('link', { name: 'Parcel Credit Tracker' }).click()
  const row = page.locator('#memo-row-CM-2026-0630')
  await expect(row.getByText('Email prepared, not sent')).toBeVisible()
  await expect(row.getByText('Prepared Sep 17, 2026 · mark it sent on the memo page')).toBeVisible()
  await row.getByRole('link', { name: 'Check details for CM-2026-0630' }).click()
  await expect(page.getByRole('heading', { name: /prepared Sep 17, 2026 by you — not confirmed as sent/ })).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Prepared today and in time: one click records today.
  await page.getByRole('region', { name: /^Email to QuickBox prepared/ }).getByRole('button', { name: 'Yes, I sent it' }).click()
  await expect(page.getByRole('region', { name: 'QuickBox dispute, Sep 17, 2026' })).toBeVisible()
})

test('"I didn’t send it" frees the findings and keeps the email in the activity', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prepared&demo=1`)
  await page.getByRole('region', { name: /^Email to QuickBox prepared/ }).getByRole('button', { name: 'I didn’t send it' }).click()
  await page.getByRole('dialog', { name: 'Discard this email?' }).getByRole('button', { name: 'Discard — I didn’t send it' }).click()
  await expect(page.getByRole('region', { name: /^Email to QuickBox prepared/ })).toHaveCount(0)
  await expect(page.locator('#finding-eg-base').getByRole('checkbox')).toBeVisible()
  await page.getByRole('navigation', { name: 'Credit memo sections' }).getByRole('link', { name: 'Activity & exports' }).click()
  await expect(page.getByText(/^Prepared dispute email discarded/)).toBeVisible()
})

test('no second dispute starts until the prepared email is answered', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prepared&demo=1`)
  await page.locator('#findings').getByRole('button', { name: /^Show 3 smaller findings/ }).click()
  await expect(page.getByText('Answer “Did you send it?” above before choosing more to dispute.')).toBeVisible()
  await expect(page.locator('#findings').getByRole('checkbox')).toHaveCount(0)
  // The prepared email can still go from a connected mailbox.
  await page.getByRole('region', { name: /^Email to QuickBox prepared/ }).getByRole('button', { name: 'Open the email again' }).click()
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await dialog.getByRole('button', { name: '← Connect instead' }).click()
  await dialog.getByRole('button', { name: 'Connect Gmail' }).click()
  await dialog.getByRole('button', { name: 'Send dispute' }).click()
  await expect(dialog.getByText('Request submitted to QuickBox from tori@implentio.com')).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('region', { name: /^Email to QuickBox prepared/ })).toHaveCount(0)
  await expect(page.locator('#finding-eg-res').getByRole('checkbox')).toBeVisible()
})

test('after the deadline the date is the question; the card records the answer in one click', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-prepared-late&demo=1`)
  await expect(page.locator('#finding-eg-base').getByText('In a prepared email', { exact: true })).toBeVisible()
  const card = page.getByRole('region', { name: /^Email to QuickBox prepared/ })
  // Prepared Sep 12: the date defaults to that day, not today.
  await expect(card.getByLabel('Sent on')).toHaveValue('2026-09-12')
  await card.getByRole('button', { name: 'Open the email again' }).click()
  const dialog = page.getByRole('dialog', { name: DIALOG })
  // A double-click on the way in doesn't record anything.
  await dialog.getByRole('button', { name: 'Back' }).click()
  await dialog.getByRole('button', { name: 'Next: review' }).dblclick()
  await expect(dialog.getByRole('button', { name: 'I sent it', exact: true })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'When did you send the email to QuickBox?' })).toHaveCount(0)
  // Opened again today, so today is the likely send date — and it's late.
  await dialog.getByRole('button', { name: 'Download all files (.zip)' }).click()
  await dialog.getByRole('button', { name: 'I sent it', exact: true }).click()
  const when = page.getByRole('dialog', { name: 'When did you send the email to QuickBox?' })
  await expect(when.getByText(/On or before Sep 15, 2026 counts as on time/)).toBeVisible()
  await expect(when.getByLabel('Sent on')).toHaveValue('2026-09-17')
  await when.getByLabel('Sent on').fill('2026-09-16')
  await when.getByRole('button', { name: 'Yes, I sent it' }).click()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByRole('region', { name: 'QuickBox dispute, Sep 16, 2026' })).toBeVisible()
  await expect(page.getByText(/sent after the deadline/)).toBeVisible()
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
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await expect(dialog.getByText('Complete credit memo', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Next: check the email' }).click()
  await expect(dialog.getByText(/back for your whole credit memo/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Next: review' }).click()
  await dialog.getByRole('button', { name: 'Continue manually' }).click()
  await dialog.getByText('Copy each part instead').click()
  await dialog.getByRole('button', { name: 'Copy the subject' }).click()
  await dialog.getByRole('button', { name: 'I sent it', exact: true }).click()
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
  await expect(sep8.getByText(/Base-Freight\.csv · Fuel-Surcharge\.csv/)).toBeVisible()
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

test('a close deadline shows its countdown and a passed one shows Expired', async ({ page }) => {
  await page.goto(`${MEMO}?scenario=dispute-deadline&demo=1`)
  await expect(page.getByText('Action needed', { exact: true })).toHaveCount(0)
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
