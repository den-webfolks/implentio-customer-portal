import { test, expect } from '@playwright/test'

test('invite modal traps focus and returns it on close', async ({ page }) => {
  await page.goto('/account')
  const trigger = page.getByRole('button', { name: 'Invite member' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Invite team member' })
  await expect(dialog).toBeVisible()

  // Tab repeatedly: focus must stay inside the dialog (the trap the
  // prototype's inline modals lacked).
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const inside = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]')
      return !!dlg && dlg.contains(document.activeElement)
    })
    expect(inside).toBe(true)
  }

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('escape closes the filter panel and returns focus to its trigger', async ({ page }) => {
  await page.goto('/tracker/memos')
  const trigger = page.getByRole('button', { name: /Filters/ })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Filters' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Filters' })).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('escape closes only the top layer at a time', async ({ page }) => {
  await page.goto('/memos/CM-2026-0630?scenario=dispute-awaiting&demo=1')
  await page.getByRole('button', { name: 'Update dispute outcomes' }).first().click()
  const modal = page.getByRole('dialog', { name: 'Update credit memo dispute' })
  await expect(modal).toBeVisible()
  await page.getByRole('button', { name: 'Awaiting outcome' }).first().click()
  await expect(page.locator('.ia-om-dd-menu')).toBeVisible()
  // First Escape closes the dropdown, the second closes the modal.
  await page.keyboard.press('Escape')
  await expect(page.locator('.ia-om-dd-menu')).toHaveCount(0)
  await expect(modal).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
})
