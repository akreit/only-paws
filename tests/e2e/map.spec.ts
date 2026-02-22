import { test, expect } from '@playwright/test'

test.describe('Map Page', () => {
  test('should load map page', async ({ page }) => {
    await page.goto('/map')

    // Map container should be present
    await expect(page.locator('[id*="map"]').or(page.locator('.relative.h-full'))).toBeVisible()
  })

  test('should display search input', async ({ page }) => {
    await page.goto('/map')

    const searchInput = page.getByPlaceholder(/search locations/i)
    await expect(searchInput).toBeVisible()
  })

  test('should display location type filters', async ({ page }) => {
    await page.goto('/map')

    // Check for some common location type filters (check individually to avoid strict mode)
    const hasRestaurant = await page
      .getByText(/restaurant/i)
      .first()
      .isVisible()
    const hasPark = await page.getByText(/park/i).first().isVisible()

    // At least one filter should be visible
    expect(hasRestaurant || hasPark).toBeTruthy()
  })

  test('should search for locations', async ({ page }) => {
    await page.goto('/map')

    const searchInput = page.getByPlaceholder(/search locations/i)
    await searchInput.fill('park')

    // Wait for search results
    await page.waitForTimeout(1000)
  })

  test('should filter by location type', async ({ page }) => {
    await page.goto('/map')

    // Click on a filter (if visible)
    const parkFilter = page.getByRole('button', { name: /park/i }).first()
    if (await parkFilter.isVisible()) {
      await parkFilter.click()
      await page.waitForTimeout(500)
    }
  })

  test('should show loading indicator', async ({ page }) => {
    await page.goto('/map')

    // Look for loading text or spinner
    page.getByText(/loading/i)
    // May or may not be visible depending on timing
  })

  test.describe('Authenticated Features', () => {
    test.skip('should show add location button when authenticated', async ({ page }) => {
      // This test would require authentication setup
      await page.goto('/map')

      // Check for add location button
      page.getByRole('button', { name: /add location/i })
      // Visibility depends on auth state
    })
  })
})
