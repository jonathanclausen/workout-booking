# Deployment Guide

This guide explains how to handle environment variables and deploy to Google Cloud Run.

## 🔒 Environment Variables

### Important: Never Commit Secrets!

Your `.env` file is already in `.gitignore` and should **never** be committed to Git or included in your Docker image.

### Required Environment Variables

```bash
NODE_ENV=production                           # Set automatically by deploy script
GOOGLE_CLIENT_ID=your-oauth-client-id         # From Google Cloud Console
GOOGLE_CLIENT_SECRET=your-oauth-secret        # From Google Cloud Console  
SESSION_SECRET=random-secret-key-here         # For session encryption
ARCA_BASE_URL=https://backend.arca.dk         # Set automatically
```

## 🚀 Deployment Process

### Step 1: Get Your Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Create or select your OAuth 2.0 Client ID
4. Copy your **Client ID** and **Client Secret**

### Step 2: Generate Session Secret

```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

### Step 3: Deploy with Environment Variables

**Option A: PowerShell (Windows - Recommended)**

The PowerShell deployment script automatically reads from your `.env` file:

```powershell
# Just deploy - it reads from .env automatically
.\deploy.ps1
```

Your `.env` file should contain:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-secret-here
SESSION_SECRET=your-random-secret-here
```

**Option B: Bash (Linux/Mac)**

```bash
# Set environment variables
export GOOGLE_CLIENT_ID='your-client-id-here'
export GOOGLE_CLIENT_SECRET='your-secret-here'
export SESSION_SECRET='your-random-secret-here'

# Deploy
./deploy.sh
```

**Option C: Set manually in PowerShell (without .env)**

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id-here"
$env:GOOGLE_CLIENT_SECRET = "your-secret-here"
$env:SESSION_SECRET = "your-random-secret-here"

.\deploy.ps1
```

### Step 4: Update OAuth Redirect URI

**The callback URL is determined automatically after deployment.**

The app uses a **relative callback URL** (`/auth/google/callback`), which Passport.js automatically converts to the full URL based on where your app is hosted. This means:

- **Local development**: `http://localhost:8080/auth/google/callback`
- **Production**: `https://your-app-xxxxx.run.app/auth/google/callback`

**After deployment**, the script will show you the exact URL to add:

1. Copy the URL shown in the deployment output
2. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
3. Click on your OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   ```
   https://arca-booking-app-xxxxx-uc.a.run.app/auth/google/callback
   ```

**For local development**, you should already have:
```
http://localhost:8080/auth/google/callback
```

**Optional**: If you need to use an absolute URL (rare), set in `.env`:
```
GOOGLE_CALLBACK_URL=https://your-custom-domain.com/auth/google/callback
```

### Step 5: Set Up Cloud Scheduler

**PowerShell (Windows):**

```powershell
.\setup-cron.ps1
```

**Bash (Linux/Mac):**

```bash
./setup-cron.sh
```

This creates a Cloud Scheduler job that runs every night at 2:00 AM.

## 🔄 Updating Environment Variables After Deployment

If you need to change environment variables after deployment:

```bash
gcloud run services update arca-booking-app \
  --region us-central1 \
  --set-env-vars "GOOGLE_CLIENT_ID=new-value"
```

Or update all at once:

```bash
gcloud run services update arca-booking-app \
  --region us-central1 \
  --set-env-vars "NODE_ENV=production,GOOGLE_CLIENT_ID=...,GOOGLE_CLIENT_SECRET=...,SESSION_SECRET=...,ARCA_BASE_URL=https://backend.arca.dk"
```

## 🔐 Security Best Practices

### ✅ DO:
- Keep `.env` in `.gitignore`
- Use different `SESSION_SECRET` for production vs development
- Rotate secrets periodically
- Use Google Secret Manager for extra security (optional)

### ❌ DON'T:
- Commit `.env` to Git
- Share secrets in Slack/email
- Use the same secrets across environments
- Hardcode secrets in code

## 🎯 Using Google Secret Manager (Advanced, Optional)

For even better security, use Google Secret Manager:

```bash
# Create secrets
echo -n "your-client-id" | gcloud secrets create google-client-id --data-file=-
echo -n "your-secret" | gcloud secrets create google-client-secret --data-file=-
echo -n "your-session-secret" | gcloud secrets create session-secret --data-file=-

# Deploy with secrets
gcloud run deploy arca-booking-app \
  --image gcr.io/$PROJECT_ID/arca-booking-app \
  --region us-central1 \
  --set-secrets "GOOGLE_CLIENT_ID=google-client-id:latest" \
  --set-secrets "GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
  --set-secrets "SESSION_SECRET=session-secret:latest"
```

## 📋 Deployment Checklist

- [ ] Google OAuth credentials created
- [ ] Session secret generated
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] OAuth redirect URI updated
- [ ] Cloud Scheduler configured
- [ ] Test login works
- [ ] Test booking rules work

## 🐛 Troubleshooting

### "OAuth error" after deployment
- Check that redirect URI is correct (must match Cloud Run URL exactly)
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly

### "Session expired" errors
- Check that `SESSION_SECRET` is set
- Make sure cookies are enabled
- Verify the domain is correct (no http/https mismatch)

### Environment variables not updating
```bash
# Force new revision
gcloud run services update arca-booking-app \
  --region us-central1 \
  --set-env-vars "UPDATED_VAR=value" \
  --no-traffic  # Optional: deploy without serving traffic first
```

## 💰 Cost Optimization

Cloud Run charges based on:
- CPU/memory usage while handling requests
- Number of requests
- Data egress

To stay in free tier:
- 2M requests/month free
- 360,000 GB-seconds memory free
- 180,000 vCPU-seconds free

Your app should easily stay within free tier limits since:
- Cron job runs once per night (30 requests/month)
- User interactions are minimal
- Most time is spent waiting for Arca API (not using CPU)

## 📊 Monitoring

View logs:
```bash
# Recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=arca-booking-app" --limit=50

# Follow logs (stream)
gcloud logging tail "resource.type=cloud_run_revision AND resource.labels.service_name=arca-booking-app"

# Or use Cloud Console
https://console.cloud.google.com/run/detail/us-central1/arca-booking-app/logs
```

View metrics:
```bash
https://console.cloud.google.com/run/detail/us-central1/arca-booking-app/metrics
```

## 🔄 CI/CD (Optional)

For automatic deployments on Git push, see `cloudbuild.yaml`. This requires:
1. Connecting your GitHub repo to Cloud Build
2. Setting up build triggers
3. Storing secrets in Secret Manager

The current setup uses manual deployment for simplicity and cost savings.

