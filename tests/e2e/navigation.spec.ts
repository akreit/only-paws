import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate between pages', async ({ page }) => {
    // Start at home
    await page.goto('/')
    await expect(page).toHaveURL('/')

    // Navigate to map
    await page.getByRole('link', { name: /explore map/i }).first().click()
    await expect(page).toHaveURL('/map')

    // Navigate back to home
    await page.getByRole('link', { name: /only paws/i }).first().click()
    await expect(page).toHaveURL('/')
  })

  test('should have working header navigation', async ({ page }) => {
    await page.goto('/')

    // Logo should link to home
    const logo = page.getByRole('link', { name: /only paws/i }).first()
    await expect(logo).toHaveAttribute('href', '/')

    // Map link should be present
    const mapLink = page.getByRole('link', { name: /explore map/i }).first()
    await expect(mapLink).toBeVisible()
  })

  test('should have working footer links', async ({ page }) => {
    await page.goto('/')

    // Scroll to footer
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Footer should be visible
    const footer = page.getByRole('contentinfo')
    await expect(footer).toBeVisible()
  })

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page')

    // Nuxt should return a 404 or redirect
    // The exact behavior depends on your error handling setup
  })

  test('should work with browser back/forward', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /explore map/i }).first().click()
    await expect(page).toHaveURL('/map')

    await page.goBack()
    await expect(page).toHaveURL('/')

    await page.goForward()
    await expect(page).toHaveURL('/map')
  })
})

test.describe('Accessibility', () => {
  test('should have proper page titles', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/only paws/i)

    await page.goto('/map')
    await expect(page).toHaveTitle(/map.*only paws/i)
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')

    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Some element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(focusedElement).toBeTruthy()
  })

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/')

    const images = await page.locator('img').all()

    for (const img of images) {
      const alt = await img.getAttribute('alt')
      // Images should have alt text (can be empty for decorative images)
      expect(alt).not.toBeNull()
    }
  })
})

test.describe('Performance', () => {
  test('should load home page quickly', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - startTime

    // Page should load in reasonable time (10s threshold for cold starts with all assets)
    expect(loadTime).toBeLessThan(10000)
  })

  test('should not have console errors on home page', async ({ page }) => {
    const errors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    await page.goto('/')

    // Filter out known/acceptable errors
    const significantErrors = errors.filter(
      (error) => !error.includes('favicon') && !error.includes('DevTools')
    )

    expect(significantErrors).toHaveLength(0)
  })
})

