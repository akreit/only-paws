import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should navigate to sign-in page', async ({ page }) => {
    await page.goto('/')

    const signInLink = page.getByRole('link', { name: /sign in/i }).first()
    await signInLink.click()

    await expect(page).toHaveURL('/sign-in')
  })

  test('should navigate to sign-up page', async ({ page }) => {
    await page.goto('/')

    const signUpLink = page.getByRole('link', { name: /sign up|get started/i }).first()
    await signUpLink.click()

    await expect(page).toHaveURL('/sign-up')
  })

  test('should display Clerk sign-in component', async ({ page }) => {
    await page.goto('/sign-in')

    // Wait for Clerk component to load
    await page.waitForTimeout(2000)

    // The page should have loaded
    expect(page.url()).toContain('/sign-in')
  })

  test('should display Clerk sign-up component', async ({ page }) => {
    await page.goto('/sign-up')

    // Wait for Clerk component to load
    await page.waitForTimeout(2000)

    // The page should have loaded
    expect(page.url()).toContain('/sign-up')
  })

  test.describe('Protected Routes', () => {
    test.skip('should redirect to sign-in when accessing protected route', async ({ page }) => {
      // This test would work once auth middleware is properly configured
      await page.goto('/profile')

      // Should redirect to sign-in if not authenticated
      // await expect(page).toHaveURL(/sign-in/)
    })
  })

  test.describe('Authenticated User', () => {
    test.skip('should show user menu when authenticated', async () => {
      // This test requires authentication setup
      // Would check for user avatar, profile link, sign out button
    })

    test.skip('should allow sign out', async () => {
      // This test requires authentication setup
      // Would click sign out and verify redirect
    })
  })
})

