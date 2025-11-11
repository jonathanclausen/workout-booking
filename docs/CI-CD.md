# CI/CD Pipeline Setup

This guide explains how to set up automatic deployments to production when you push to the `main` branch.

## Overview

The CI/CD pipeline uses **Google Cloud Build** to:
1. ✅ Run all tests
2. 🏗️ Build the frontend
3. 🐳 Build the Docker image
4. 📦 Push to Container Registry
5. 🚀 Deploy to Cloud Run (only if tests pass)

## Prerequisites

- Google Cloud Project set up
- GitHub repository
- `.env` file with secrets locally

## Setup Steps

### Step 1: Store Secrets in Google Secret Manager

Run the setup script to move your secrets from `.env` to Google Secret Manager:

```powershell
.\scripts\setup-cicd.ps1
```

This will:
- Enable required Google Cloud APIs
- Create secrets in Secret Manager
- Grant Cloud Build permissions

### Step 2: Connect GitHub Repository

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"Connect Repository"**
3. Select **GitHub** as the source
4. Authenticate with GitHub
5. Select your `arca` repository
6. Click **"Connect"**

### Step 3: Create Build Trigger

1. In Cloud Build Triggers, click **"Create Trigger"**
2. Configure:
   - **Name**: `deploy-on-main-push`
   - **Event**: Push to a branch
   - **Source**: Your GitHub repository
   - **Branch**: `^main$` (regex for main branch)
   - **Configuration**: Cloud Build configuration file (yaml)
   - **Location**: `cloudbuild.yaml`
3. Click **"Create"**

### Step 4: Test the Pipeline

Push a commit to the main branch:

```bash
git add .
git commit -m "Test CI/CD pipeline"
git push origin main
```

The pipeline will automatically:
1. Run tests
2. Build and deploy if tests pass
3. Fail the deployment if any test fails

## Monitoring Builds

### View Build Status

- **Cloud Console**: https://console.cloud.google.com/cloud-build/builds
- **Build logs**: Click on any build to see detailed logs

### Build Notifications

Set up notifications for build results:

```bash
# Install Cloud Build app on GitHub (gets build status on PRs)
# Go to: https://github.com/marketplace/google-cloud-build
```

## Pipeline Configuration

The pipeline is defined in `cloudbuild.yaml`. Key features:

### Sequential Steps

1. **Tests** - Must pass before building
2. **Frontend Build** - Compiles Angular app
3. **Docker Build** - Creates container image
4. **Deploy** - Updates Cloud Run service

### Environment Variables

Tests run with:
- `NODE_ENV=test`
- `SESSION_SECRET=test-secret-key`
- Mock credentials for OAuth

Production deployment uses:
- Secrets from Google Secret Manager
- `NODE_ENV=production`

### Build Time

Typical build takes **5-8 minutes**:
- Tests: ~2 min
- Frontend build: ~2 min
- Docker build: ~2 min
- Deploy: ~2 min

## Secrets Management

### Viewing Secrets

```bash
# List all secrets
gcloud secrets list

# View secret metadata
gcloud secrets describe session-secret

# Access secret value (requires permission)
gcloud secrets versions access latest --secret="session-secret"
```

### Updating Secrets

```bash
# Update a secret
echo -n "new-secret-value" | gcloud secrets versions add session-secret --data-file=-
```

The deployment automatically uses the latest version.

### Rotating Secrets

⚠️ **Important**: When rotating `SESSION_SECRET`:
1. All users will be logged out
2. All stored Arca credentials become unreadable
3. Users must re-enter their Arca login

To rotate safely:
1. Update secret in Secret Manager
2. Re-deploy the app
3. Notify users to log in again

## Manual Deployment

If you need to deploy manually (bypassing CI/CD):

```bash
# Use the existing deploy script
.\scripts\deploy.ps1
```

This is useful for:
- Emergency hotfixes
- Testing before committing
- Deploying from a non-main branch

## Troubleshooting

### Build Fails: "Permission Denied"

Grant Cloud Build service account permissions:

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

# Grant Cloud Run admin
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/run.admin"

# Grant service account user
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUD_BUILD_SA" \
  --role="roles/iam.serviceAccountUser"
```

### Build Fails: "Secret Not Found"

Ensure secrets exist:

```bash
gcloud secrets list
```

If missing, run `.\scripts\setup-cicd.ps1` again.

### Tests Fail in CI But Pass Locally

- Check test dependencies in `backend/package.test.json`
- Verify Node.js version (pipeline uses Node 20)
- Check environment variables in `cloudbuild.yaml`

### Deployment Succeeds But App Crashes

Check Cloud Run logs:

```bash
gcloud logging tail "resource.type=cloud_run_revision"
```

Common issues:
- Missing environment variables
- Secret Manager permissions
- Database connection errors

## Cost Considerations

**Cloud Build Free Tier:**
- 120 build-minutes/day free
- After that: $0.003/build-minute

**Typical usage:**
- 1 deployment = ~8 minutes
- ~15 deployments/day = free
- More than 15/day = ~$0.02/deployment

**Storage (Container Registry):**
- First 0.5 GB free
- After: $0.026/GB/month
- Old images auto-delete after 30 days (can configure)

## Best Practices

### Branch Protection

Set up branch protection on `main`:
1. Go to GitHub → Settings → Branches
2. Add rule for `main`
3. Enable:
   - Require pull request reviews
   - Require status checks to pass (Cloud Build)

### Pull Request Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push to GitHub: `git push origin feature/my-feature`
4. Create Pull Request
5. Cloud Build runs tests automatically
6. Merge to main after approval → auto-deploy

### Rollback

If deployment breaks production:

```bash
# Find previous working revision
gcloud run revisions list --service=arca-booking-app --region=us-central1

# Route traffic to previous revision
gcloud run services update-traffic arca-booking-app \
  --region=us-central1 \
  --to-revisions=arca-booking-app-00042-xyz=100
```

## Alternative: GitHub Actions

If you prefer GitHub Actions over Cloud Build, here's a basic workflow:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Run Tests
        run: |
          cd backend
          cp package.test.json package.json
          npm install
          npm test
        env:
          NODE_ENV: test
          SESSION_SECRET: test-secret
      
      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ secrets.GCP_PROJECT_ID }}
      
      - name: Deploy
        run: ./scripts/deploy.sh
```

## Summary

✅ Automatic deployments on push to main  
✅ Tests must pass before deployment  
✅ Secrets managed securely in Secret Manager  
✅ Full build logs and history  
✅ Easy rollback if needed  

For questions or issues, check the [Cloud Build documentation](https://cloud.google.com/build/docs).

