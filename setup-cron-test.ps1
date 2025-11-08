# Setup Cloud Scheduler for TESTING - runs every minute
# PowerShell version

Write-Host "Setting up TEST Cloud Scheduler (runs every minute)" -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "gcloud CLI not found." -ForegroundColor Red
    exit 1
}

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
$REGION = "us-central1"

if (-not $PROJECT_ID) {
    Write-Host "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

# Get Cloud Run service URL
Write-Host "Project: $PROJECT_ID" -ForegroundColor Green
Write-Host "Getting Cloud Run service URL..." -ForegroundColor Yellow

$SERVICE_URL = gcloud run services describe arca-booking-app --region $REGION --format 'value(status.url)' 2>$null

if (-not $SERVICE_URL) {
    Write-Host "Cloud Run service 'arca-booking-app' not found. Deploy it first." -ForegroundColor Red
    exit 1
}

Write-Host "Service URL: $SERVICE_URL" -ForegroundColor Green

# Delete existing test job if it exists
Write-Host "Checking for existing test scheduler job..." -ForegroundColor Yellow
gcloud scheduler jobs delete arca-booking-checker-test --location=$REGION --quiet 2>$null | Out-Null

# Create new scheduler job (runs every minute for testing)
Write-Host "Creating TEST Cloud Scheduler job (every minute)..." -ForegroundColor Yellow
gcloud scheduler jobs create http arca-booking-checker-test `
  --schedule="* * * * *" `
  --uri="$SERVICE_URL/cron/check-bookings" `
  --http-method=POST `
  --location=$REGION `
  --headers="X-Cloudscheduler=true" `
  --description="TEST - Check and book Arca classes every minute"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create scheduler job!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "TEST Cloud Scheduler job created!" -ForegroundColor Green
Write-Host "The app will check for bookings EVERY MINUTE for testing" -ForegroundColor Yellow
Write-Host ""
Write-Host "You can view the job at:" -ForegroundColor Yellow
Write-Host "   https://console.cloud.google.com/cloudscheduler?project=$PROJECT_ID"
Write-Host ""
Write-Host "To manually trigger the job:" -ForegroundColor Cyan
Write-Host "   gcloud scheduler jobs run arca-booking-checker-test --location=$REGION"
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "   gcloud logging read 'resource.type=cloud_run_revision AND resource.labels.service_name=arca-booking-app' --limit 50 --format json"
Write-Host ""
Write-Host "REMEMBER: Delete this test job when done!" -ForegroundColor Red
Write-Host "   gcloud scheduler jobs delete arca-booking-checker-test --location=$REGION"
Write-Host ""

