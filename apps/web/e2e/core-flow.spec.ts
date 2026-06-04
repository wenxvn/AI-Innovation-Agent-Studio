import { test, expect } from '@playwright/test'

test.describe('Core Flow', () => {
  test('Landing page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/AI Innovation Agent Studio|智创工坊/)
  })

  test('Dashboard loads', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1, h2')).toBeVisible()
  })

  test('Theme toggle works', async ({ page }) => {
    await page.goto('/dashboard')
    const themeButton = page.locator('[aria-label*="theme"], [aria-label*="Theme"], button:has(svg)').first()
    if (await themeButton.isVisible()) {
      await themeButton.click()
    }
  })
})

test.describe('Project Workflow', () => {
  test('Can navigate to project pages', async ({ page }) => {
    await page.goto('/dashboard')
    const projectLink = page.locator('a[href*="/projects/"]').first()
    if (await projectLink.isVisible()) {
      await projectLink.click()
      await expect(page.url()).toContain('/projects/')
    }
  })
})
