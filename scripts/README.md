# Deployment & Setup Scripts

This folder contains all PowerShell scripts for deploying and managing the Arca Booking App on Google Cloud Platform.

## Scripts

### Deployment

- **`deploy.ps1`** - Main deployment script
  - Builds Docker image
  - Pushes to Google Container Registry
  - Deploys to Cloud Run with optimized settings (256Mi RAM, 0-3 instances)
  - Automatically reads environment variables from `.env` file
  - Usage: `.\scripts\deploy.ps1`

- **`deploy-firestore-rules.ps1`** - Deploy Firestore security rules
  - Updates Firestore security rules
  - Usage: `.\scripts\deploy-firestore-rules.ps1`

### Cloud Scheduler Setup

- **`setup-cron.ps1`** - Set up nightly booking checker
  - Creates Cloud Scheduler job that runs at 2 AM daily
  - Usage: `.\scripts\setup-cron.ps1`

- **`setup-cron-test.ps1`** - Set up test scheduler
  - Creates Cloud Scheduler job that runs every minute (for testing)
  - Usage: `.\scripts\setup-cron-test.ps1`

### Service Account & Budget

- **`setup-service-account.ps1`** - Create service account for local development
  - Creates service account with Firestore access
  - Downloads key file for local testing
  - Usage: `.\scripts\setup-service-account.ps1`

- **`setup-budget.ps1`** - Set up budget alerts
  - Creates $5/month budget with email alerts at 50%, 90%, 100%
  - Usage: `.\scripts\setup-budget.ps1`

## Prerequisites

All scripts require:
- Google Cloud SDK (`gcloud`) installed and authenticated
- Project ID configured: `gcloud config set project YOUR_PROJECT_ID`
- `.env` file in project root with required variables

## Typical Deployment Workflow

1. **First-time setup:**
   ```powershell
   # Set up service account for local dev
   .\scripts\setup-service-account.ps1
   
   # Set up budget alerts
   .\scripts\setup-budget.ps1
   
   # Deploy Firestore security rules
   .\scripts\deploy-firestore-rules.ps1
   ```

2. **Deploy application:**
   ```powershell
   # Deploy to Cloud Run
   .\scripts\deploy.ps1
   ```

3. **Set up automation:**
   ```powershell
   # Production: runs at 2 AM daily
   .\scripts\setup-cron.ps1
   
   # OR for testing: runs every minute
   .\scripts\setup-cron-test.ps1
   ```

4. **Update OAuth redirect URIs:**
   - After first deployment, add Cloud Run URL to Google OAuth settings
   - See output from `deploy.ps1` for the exact URL

## Environment Variables

Required in `.env` file:
```env
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
SESSION_SECRET=your-random-secret
```

## Troubleshooting

### "Project not set"
```powershell
gcloud config set project YOUR_PROJECT_ID
```

### "APIs not enabled"
```powershell
gcloud services enable run.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

### "Permission denied"
```powershell
# Authenticate
gcloud auth login

# Or use application default credentials
gcloud auth application-default login
```

## Notes

- All scripts use `us-central1` region by default
- Scripts are idempotent - safe to run multiple times
- Check script output for any errors or warnings
- Cloud Run deployment takes ~3-5 minutes

