# Deployment Scripts Reference

This project includes both **PowerShell** (Windows) and **Bash** (Linux/Mac) deployment scripts.

## Available Scripts

### PowerShell Scripts (Windows)

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy.ps1` | Deploy app to Cloud Run | `.\deploy.ps1` |
| `setup-cron.ps1` | Set up Cloud Scheduler (2 AM nightly) | `.\setup-cron.ps1` |

### Bash Scripts (Linux/Mac)

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy.sh` | Deploy app to Cloud Run | `./deploy.sh` |
| `setup-cron.sh` | Set up Cloud Scheduler (2 AM nightly) | `./setup-cron.sh` |

## PowerShell Deployment (Windows)

### Prerequisites
- Google Cloud SDK installed
- `.env` file with required variables

### Complete Deployment

```powershell
# 1. Deploy application
.\deploy.ps1

# 2. Update OAuth redirect URI (shown after deployment)
# 3. Set up automated booking
.\setup-cron.ps1
```

### What Each Script Does

**`deploy.ps1`:**
- ✅ Reads environment variables from `.env` file automatically
- ✅ Validates required variables are set
- ✅ Builds Docker image
- ✅ Deploys to Cloud Run with all environment variables
- ✅ Shows OAuth redirect URI to add to Google Console

**`setup-cron.ps1`:**
- ✅ Creates Cloud Scheduler job
- ✅ Configures to run every night at 2:00 AM
- ✅ Sets up proper authentication headers
- ✅ Provides test command

## Bash Deployment (Linux/Mac)

### Prerequisites
- Google Cloud SDK installed
- Environment variables set

### Complete Deployment

```bash
# 1. Set environment variables
export GOOGLE_CLIENT_ID='your-client-id'
export GOOGLE_CLIENT_SECRET='your-client-secret'
export SESSION_SECRET='your-session-secret'

# 2. Deploy application
./deploy.sh

# 3. Update OAuth redirect URI (shown after deployment)

# 4. Set up automated booking
./setup-cron.sh
```

## Environment Variables

Both PowerShell and Bash scripts require:

```
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret
SESSION_SECRET=your-random-session-secret
```

### PowerShell: Using .env File (Recommended)

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdef123456
SESSION_SECRET=randomBase64String==
```

Then just run:
```powershell
.\deploy.ps1
```

### PowerShell: Setting Variables Manually

```powershell
$env:GOOGLE_CLIENT_ID = "your-client-id"
$env:GOOGLE_CLIENT_SECRET = "your-client-secret"
$env:SESSION_SECRET = "your-session-secret"

.\deploy.ps1
```

### Bash: Setting Variables

```bash
export GOOGLE_CLIENT_ID='your-client-id'
export GOOGLE_CLIENT_SECRET='your-client-secret'
export SESSION_SECRET='your-session-secret'

./deploy.sh
```

## Generating Session Secret

**PowerShell:**
```powershell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Bash:**
```bash
openssl rand -base64 32
```

## Testing Deployment

After deployment, test manually:

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:8080/cron/test-bookings" -Method POST
```

**Bash:**
```bash
curl -X POST http://localhost:8080/cron/test-bookings
```

## Troubleshooting

### "gcloud not found"
- Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- Restart PowerShell/terminal after installation

### "No GCP project set"
```powershell
gcloud config set project YOUR_PROJECT_ID
```

### "Environment variables not set"
- Check your `.env` file exists (PowerShell)
- Check variables are exported (Bash)
- Make sure there are no extra quotes in `.env`

### "Build failed"
- Check Docker daemon is running
- Verify you have Cloud Build API enabled
- Check your GCP project has billing enabled

### "OAuth redirect URI error"
- Copy the URL shown after deployment
- Add it to Google Cloud Console → APIs & Services → Credentials
- Format: `https://your-app.run.app/auth/google/callback`

## Script Features

### Both PowerShell and Bash Scripts:
- ✅ Automatic environment variable handling
- ✅ Validation of required variables
- ✅ Colored output for better readability
- ✅ Error handling and exit codes
- ✅ Clear next steps instructions

### PowerShell Specific Features:
- ✅ Native `.env` file parsing
- ✅ Windows-friendly path handling
- ✅ PowerShell error handling
- ✅ Colored output with `-ForegroundColor`

### Bash Specific Features:
- ✅ POSIX-compliant
- ✅ Works on Linux, macOS, WSL
- ✅ Standard bash error handling

## Which Should You Use?

- **Windows users**: Use PowerShell scripts (`*.ps1`)
- **Linux/Mac users**: Use Bash scripts (`*.sh`)
- **WSL users**: Can use either, but Bash recommended

Both sets of scripts do exactly the same thing - choose based on your operating system!

