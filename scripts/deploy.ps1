# Deployment script for Arca Booking App to Google Cloud Run
# PowerShell version

Write-Host "[DEPLOY] Deploying Arca Booking App to Google Cloud Run" -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] gcloud CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "        https://cloud.google.com/sdk/docs/install"
    exit 1
}

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "[ERROR] No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Project: $PROJECT_ID" -ForegroundColor Green

# Load environment variables from .env file if it exists
if (Test-Path ".env") {
    Write-Host "[INFO] Loading environment variables from .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remove quotes if present (both single and double)
            if ($value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            if ($value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "[SUCCESS] Environment variables loaded from .env" -ForegroundColor Green
} else {
    Write-Host "[WARNING] No .env file found - checking environment variables..." -ForegroundColor Yellow
}

# Check for required environment variables
$GOOGLE_CLIENT_ID = $env:GOOGLE_CLIENT_ID
$GOOGLE_CLIENT_SECRET = $env:GOOGLE_CLIENT_SECRET
$SESSION_SECRET = $env:SESSION_SECRET

if (-not $GOOGLE_CLIENT_ID -or -not $GOOGLE_CLIENT_SECRET -or -not $SESSION_SECRET) {
    Write-Host ""
    Write-Host "[ERROR] Required environment variables not set!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file with:" -ForegroundColor Yellow
    Write-Host "  GOOGLE_CLIENT_ID=your-client-id"
    Write-Host "  GOOGLE_CLIENT_SECRET=your-client-secret"
    Write-Host "  SESSION_SECRET=your-random-secret"
    Write-Host ""
    Write-Host "Or set them in PowerShell:" -ForegroundColor Yellow
    Write-Host '  $env:GOOGLE_CLIENT_ID = "your-client-id"'
    Write-Host '  $env:GOOGLE_CLIENT_SECRET = "your-client-secret"'
    Write-Host '  $env:SESSION_SECRET = "your-random-secret"'
    exit 1
}

Write-Host "All required environment variables are set" -ForegroundColor Green

# Display environment variables (with masked secrets)
Write-Host ""
Write-Host "Environment variables to deploy:" -ForegroundColor Cyan
Write-Host "  NODE_ENV: production" -ForegroundColor Gray
Write-Host "  GOOGLE_CLOUD_PROJECT: $PROJECT_ID" -ForegroundColor Gray
Write-Host "  GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID" -ForegroundColor Gray
if ($GOOGLE_CLIENT_SECRET) {
    $maskedSecret = $GOOGLE_CLIENT_SECRET.Substring(0, [Math]::Min(10, $GOOGLE_CLIENT_SECRET.Length)) + "..."
    Write-Host "  GOOGLE_CLIENT_SECRET: $maskedSecret" -ForegroundColor Gray
}
if ($SESSION_SECRET) {
    $maskedSession = $SESSION_SECRET.Substring(0, [Math]::Min(8, $SESSION_SECRET.Length)) + "..."
    Write-Host "  SESSION_SECRET: $maskedSession" -ForegroundColor Gray
}
Write-Host "  ARCA_BASE_URL: https://backend.arca.dk" -ForegroundColor Gray

Write-Host ""
Write-Host "Building and deploying..." -ForegroundColor Cyan

# Submit build
Write-Host "Building Docker image..." -ForegroundColor Yellow
gcloud builds submit --tag "gcr.io/$PROJECT_ID/arca-booking-app"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Deploy to Cloud Run with environment variables
Write-Host ""
Write-Host "Deploying to Cloud Run (cost-optimized)..." -ForegroundColor Yellow
gcloud run deploy arca-booking-app `
  --image "gcr.io/$PROJECT_ID/arca-booking-app" `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --memory 256Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 3 `
  --concurrency 80 `
  --timeout 60 `
  --cpu-throttling `
  --set-env-vars "NODE_ENV=production" `
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" `
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" `
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" `
  --set-env-vars "SESSION_SECRET=$SESSION_SECRET" `
  --set-env-vars "ARCA_BASE_URL=https://backend.arca.dk"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Get the service URL
$SERVICE_URL = gcloud run services describe arca-booking-app --region us-central1 --format 'value(status.url)' 2>$null

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is live at: $SERVICE_URL" -ForegroundColor Cyan
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "IMPORTANT: Update Google OAuth Settings" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "1. Go to: https://console.cloud.google.com/apis/credentials"
Write-Host "2. Click on your OAuth 2.0 Client ID"
Write-Host "3. Add this to 'Authorized redirect URIs':"
Write-Host ""
Write-Host "   $SERVICE_URL/auth/google/callback" -ForegroundColor Green
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  • Test your app: $SERVICE_URL"
Write-Host "  • Set up cron job: ./setup-cron.sh"
Write-Host ""

