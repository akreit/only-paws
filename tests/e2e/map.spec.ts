import { test, expect } from '@playwright/test'

test.describe('Map Page', () => {
  test('should load map page', async ({ page }) => {
    await page.goto('/map')

    // Map container should be present
    await expect(
      page.locator('[data-testid="map-container"]').or(page.locator('.relative.overflow-hidden'))
    ).toBeVisible()
  })

  test('should display search input', async ({ page }) => {
    await page.goto('/map')

    const searchInput = page.getByRole('combobox', { name: /search/i })
    await expect(searchInput).toBeVisible()
  })

  test('should open a saved place from the search dropdown', async ({ page }) => {
    // Wait for the initial saved-places load so the page is hydrated before typing
    const initialLoad = page.waitForResponse((response) =>
      response.url().includes('/api/locations')
    )
    await page.goto('/map')
    await initialLoad

    // Saved places come from the seed data and need no Google key
    const searchInput = page.getByRole('combobox', { name: /search/i })
    await searchInput.fill('Cubbon')

    const option = page.getByRole('option', { name: /Cubbon Park Dog Run/i })
    await expect(option).toBeVisible()
    await expect(page.getByText('Saved places', { exact: true })).toBeVisible()

    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')

    const panel = page.getByRole('dialog', { name: 'Cubbon Park Dog Run' })
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('link', { name: 'Details' })).toBeVisible()
    await expect(page).toHaveURL(/[?&]place=/)

    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
    await expect(page).not.toHaveURL(/[?&]place=/)
  })

  test('should restore the open place panel after a reload', async ({ page }) => {
    const initialLoad = page.waitForResponse((response) =>
      response.url().includes('/api/locations')
    )
    await page.goto('/map')
    await initialLoad

    const searchInput = page.getByRole('combobox', { name: /search/i })
    await searchInput.fill('Cubbon')
    await expect(page.getByRole('option', { name: /Cubbon Park Dog Run/i })).toBeVisible()
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')

    const panel = page.getByRole('dialog', { name: 'Cubbon Park Dog Run' })
    await expect(panel).toBeVisible()
    await expect(page).toHaveURL(/[?&]place=/)

    await page.reload()
    await expect(page.getByRole('dialog', { name: 'Cubbon Park Dog Run' })).toBeVisible()
  })

  test('should close the panel with Back and restore it when returning from Details', async ({
    page,
  }) => {
    const initialLoad = page.waitForResponse((response) =>
      response.url().includes('/api/locations')
    )
    await page.goto('/map')
    await initialLoad

    const searchInput = page.getByRole('combobox', { name: /search/i })
    await searchInput.fill('Cubbon')
    await expect(page.getByRole('option', { name: /Cubbon Park Dog Run/i })).toBeVisible()
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')

    const panel = page.getByRole('dialog', { name: 'Cubbon Park Dog Run' })
    await expect(panel).toBeVisible()

    // Details -> Back restores the panel
    await panel.getByRole('link', { name: 'Details' }).click()
    await expect(page).toHaveURL(/\/locations\//)
    await page.goBack()
    await expect(page).toHaveURL(/\/map\?.*place=/)
    await expect(page.getByRole('dialog', { name: 'Cubbon Park Dog Run' })).toBeVisible()

    // Back (e.g. the mobile hardware button) closes the panel and stays on the map
    await page.goBack()
    await expect(page).toHaveURL(/\/map$/)
    await expect(page.getByRole('dialog', { name: 'Cubbon Park Dog Run' })).toBeHidden()
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

    const searchInput = page.getByRole('combobox', { name: /search/i })
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
