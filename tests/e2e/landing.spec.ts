import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/')

    // Check for hero heading
    await expect(page.getByRole('heading', { name: /discover dog-friendly places/i })).toBeVisible()

    // Check for CTA buttons
    await expect(page.getByRole('link', { name: /explore map/i })).toBeVisible()
  })

  test('should navigate to map page', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('link', { name: /explore map/i }).first().click()

    await expect(page).toHaveURL('/map')
  })

  test('should display features section', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText(/interactive map/i)).toBeVisible()
    await expect(page.getByText(/reviews & ratings/i)).toBeVisible()
    await expect(page.getByText(/photo sharing/i)).toBeVisible()
  })

  test('should display featured locations', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: /featured locations/i })).toBeVisible()
  })

  test('should have navigation header', async ({ page }) => {
    await page.goto('/')

    // Check for logo/brand
    await expect(page.getByText('Only Paws')).toBeVisible()

    // Check for navigation links
    await expect(page.getByRole('link', { name: /explore map/i })).toBeVisible()
  })

  test('should have footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByText('Only Paws')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    await expect(page.getByText('Only Paws')).toBeVisible()
  })
})

