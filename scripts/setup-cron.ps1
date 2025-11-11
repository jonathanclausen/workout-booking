# Setup Cloud Scheduler for automatic booking checks
# PowerShell version

Write-Host "Setting up Cloud Scheduler for Arca Booking App" -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: gcloud CLI not found." -ForegroundColor Red
    exit 1
}

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
$REGION = "us-central1"

if (-not $PROJECT_ID) {
    Write-Host "ERROR: No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

# Get Cloud Run service URL
Write-Host "Project: $PROJECT_ID" -ForegroundColor Green
Write-Host "Getting Cloud Run service URL..." -ForegroundColor Yellow

$SERVICE_URL = gcloud run services describe arca-booking-app --region $REGION --format 'value(status.url)' 2>$null

if (-not $SERVICE_URL) {
    Write-Host "ERROR: Cloud Run service 'arca-booking-app' not found. Deploy it first." -ForegroundColor Red
    exit 1
}

Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Green

# Delete existing job if it exists
Write-Host "Checking for existing scheduler job..." -ForegroundColor Yellow
gcloud scheduler jobs delete booking-check-job --location=$REGION --quiet 2>$null | Out-Null

# Create new scheduler job (runs every morning at 6 AM Copenhagen time)
Write-Host "Creating Cloud Scheduler job..." -ForegroundColor Yellow
gcloud scheduler jobs create http booking-check-job `
  --schedule="0 6 * * *" `
  --time-zone="Europe/Copenhagen" `
  --uri="$SERVICE_URL/cron/check-bookings" `
  --http-method=POST `
  --location=$REGION `
  --headers="X-Cloudscheduler=true" `
  --description="Check and book Arca classes automatically every morning at 6:00 AM Copenhagen time"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to create scheduler job!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "SUCCESS: Cloud Scheduler job created!" -ForegroundColor Green
Write-Host "The app will check for bookings every morning at 6:00 AM Copenhagen time" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can view the job at:" -ForegroundColor Yellow
Write-Host "   https://console.cloud.google.com/cloudscheduler?project=$PROJECT_ID"
Write-Host ""
Write-Host "To manually trigger the job:" -ForegroundColor Cyan
Write-Host "   gcloud scheduler jobs run booking-check-job --location=$REGION"
Write-Host ""

