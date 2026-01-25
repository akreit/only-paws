# GitHub Actions Secrets Setup

No additional secrets needed - uses GitHub Actions token.

3. Coverage reports will be uploaded automatically
4. Connect your GitHub repository
5. Sign up at [codecov.io](https://codecov.io)

For coverage reporting:

## Codecov Integration (Optional)

4. Require linear history
5. Require branches to be up to date
   - ✅ Build Application
   - ✅ E2E Tests
   - ✅ Unit Tests
   - ✅ Type Check
   - ✅ Lint Code
6. Require status checks to pass:
7. Require pull request before merging

Recommended branch protection rules for `main`:

## Branch Protection

````
cat .vercel/project.json
npx vercel link
```bash
4. For Project ID and Org ID:
3. Create a new token
2. Go to **Settings** → **Tokens**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
### Vercel Deployment

4. Copy **Publishable Key** and **Secret Key**
3. Go to **API Keys**
2. Select your application
1. Go to [Clerk Dashboard](https://dashboard.clerk.dev)
### Clerk Keys

## Getting the Values

6. Click **Add secret**
5. Enter the name and value
4. Click **New repository secret**
3. Navigate to **Secrets and variables** → **Actions**
2. Click on **Settings**
1. Go to your GitHub repository

## How to Add Secrets

- `GOOGLE_MAPS_API_KEY` - Google Maps API key (optional for E2E)
### External Services (for E2E tests)

- `VERCEL_PROJECT_ID` - Your Vercel project ID
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_TOKEN` - Vercel deployment token
### Deployment (Optional - for auto-deploy)

- `CLERK_SECRET_KEY` - Your Clerk secret key
- `CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key
### Clerk (Authentication)

Go to: **Settings → Secrets and variables → Actions → New repository secret**

## Required Secrets

To enable CI/CD pipeline, add these secrets to your GitHub repository:


````
