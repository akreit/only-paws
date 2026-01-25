# Testing Guide

- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Vue Test Utils](https://test-utils.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)

## Resources

- Exclude test files from coverage
- Check coverage report for details
- Add tests for uncovered lines
  **Coverage not meeting threshold**

- Look for blocking network requests
- Check if server is starting properly
- Increase timeout in playwright.config.ts
  **Timeout errors in E2E tests**

- Verify Node.js version matches CI
- Ensure database is seeded properly
- Check environment variables
  **Tests failing locally but passing in CI**

### Common Issues

## Troubleshooting

````
})
  // Clean up DOM, reset mocks, etc.
afterEach(() => {
```typescript
Always clean up after tests:
### Cleaning Up

````

})
...overrides,
type: 'PARK',
name: 'Test Location',
id: 'test-id',
const createMockLocation = (overrides = {}) => ({

```typescript
Use factories or fixtures for consistent test data:
### Creating Test Data

## Test Data

```

}))
}),
initializeMap: vi.fn(),
useMap: () => ({
vi.mock('~/composables/useMap', () => ({

import { vi } from 'vitest'

```typescript
Mock in individual test files:
### External Services

```

process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_mock'

```typescript
Set in `tests/setup.ts`:
### Environment Variables

## Mocking

```

PWDEBUG=1 npm run test:e2e

# Use Playwright Inspector

npm run test:e2e -- --debug

# Run in debug mode

npm run test:e2e -- --headed

# Run in headed mode to see browser

```bash
### E2E Tests

```

node --inspect-brk node_modules/vitest/vitest.mjs

# Run tests in debug mode

npm run test:unit -- --reporter=verbose MyComponent.spec.ts

# Debug specific test

```bash
### Unit Tests

## Debugging Tests

- Update tests when behavior changes
- Document complex test scenarios
- Keep test data minimal
- Run tests before committing
- Write tests alongside features
### General

5. Use page objects for complex flows
4. Keep tests independent
3. Avoid testing implementation details
2. Use semantic selectors (role, label, text)
1. Test critical user flows
### E2E Tests

5. Test edge cases and error states
4. Mock external dependencies
3. Keep tests focused and simple
2. Use meaningful test descriptions
1. Test component behavior, not implementation
### Unit Tests

## Best Practices

5. **Build** - Production build verification
4. **E2E Tests** - Full application tests
3. **Unit Tests** - Component and utility tests
2. **Type Check** - TypeScript compilation
1. **Lint** - Code quality checks
### CI Pipeline Stages

- Every pull request
- Every push to `main` or `develop` branches
Tests run automatically on:

## Continuous Integration

After running coverage command, open `coverage/index.html` in your browser.
### Viewing Coverage Report

- Statements
- Branches
- Functions
- Lines
Coverage thresholds are set to 80% for:

Run `npm run test:unit:coverage` to see detailed coverage report.
### Current Coverage

## Test Coverage

```

})
await expect(page).toHaveURL('/map')
await page.getByRole('link', { name: 'Map' }).click()
await page.goto('/')
test('should navigate to page', async ({ page }) => {

import { test, expect } from '@playwright/test'

```typescript

### E2E Test Example

```

})
})
expect(wrapper.text()).toContain('Test Title')

    })
      },
        title: 'Test Title',
      props: {
    const wrapper = mount(MyComponent, {

it('renders correctly', () => {
describe('MyComponent', () => {

import MyComponent from '~/components/MyComponent.vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

```typescript

### Unit Test Example

## Writing Tests

- `navigation.spec.ts` - Navigation and accessibility tests
- `auth.spec.ts` - Authentication flow tests
- `map.spec.ts` - Map functionality tests
- `landing.spec.ts` - Landing page tests
Located in `tests/e2e/`:
### E2E Tests

- `utils/` - Utility function tests
- `composables/` - Composable function tests
- `components/` - Vue component tests
Located in `tests/unit/`, organized by type:
### Unit Tests

## Test Structure

```

npm run test:e2e tests/e2e/landing.spec.ts

# Run specific test file

npm run test:e2e -- --headed

# Run E2E tests in headed mode

npm run test:e2e:ui

# Run E2E tests in UI mode

npm run test:e2e

# Run E2E tests

```bash
### E2E Tests

```

npm run test:unit -- --watch

# Run unit tests in watch mode

npm run test:unit:coverage

# Run unit tests with coverage

npm run test:unit

# Run unit tests

```bash
### Unit Tests

```

npm run test:watch

# Run tests in watch mode

npm test

# Run all tests

```bash
### All Tests

## Running Tests

This project uses a comprehensive testing strategy with both unit tests (Vitest) and end-to-end tests (Playwright).

## Overview


```
