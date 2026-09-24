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

test('escape closes the filter menu and returns focus to its trigger', async ({ page }) => {
  await page.goto('/tracker/memos')
  const trigger = page.getByRole('button', { name: 'Filter', exact: true })
  await trigger.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('escape closes only the top layer at a time', async ({ page }) => {
  await page.goto('/memos/CM-2026-0630')
  await page.locator('#finding-eg-base').getByRole('button', { name: 'Show me why' }).click()
  await page.locator('#finding-eg-base').getByRole('button', { name: /^See all/ }).click()
  const modal = page.getByRole('dialog', { name: /^All 510 packages/ })
  await expect(modal).toBeVisible()
  await modal.getByRole('combobox', { name: 'Service level' }).click()
  await expect(page.getByRole('listbox')).toBeVisible()
  // First Escape closes the select menu, the second closes the modal.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0)
  await expect(modal).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
})
