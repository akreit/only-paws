import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should display hero section', async ({ page }) => {
    await page.goto('/')

    // Check for hero heading
    await expect(page.getByRole('heading', { name: /discover dog-friendly places/i })).toBeVisible()

    // Check for CTA buttons (use first since there are multiple "Explore Map" links)
    await expect(page.getByRole('link', { name: /explore map/i }).first()).toBeVisible()
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

    // Check for logo/brand (use first since "Only Paws" appears multiple times)
    await expect(page.getByText('Only Paws').first()).toBeVisible()

    // Check for navigation links (use first since link appears in header, hero, and footer)
    await expect(page.getByRole('link', { name: /explore map/i }).first()).toBeVisible()
  })

  test('should have footer', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('contentinfo')).toBeVisible()
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    await expect(page.getByText('Only Paws').first()).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')

    await expect(page.getByText('Only Paws').first()).toBeVisible()
  })
})

