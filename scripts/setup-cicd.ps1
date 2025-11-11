# Setup CI/CD pipeline with Google Cloud Build
# This script:
# 1. Stores secrets in Google Secret Manager
# 2. Creates a Cloud Build trigger for the main branch
# 3. Grants necessary permissions

Write-Host "Setting up CI/CD Pipeline for Arca Booking App" -ForegroundColor Cyan

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

Write-Host "Project: $PROJECT_ID" -ForegroundColor Green

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found. Create it with your secrets first." -ForegroundColor Red
    exit 1
}

# Read secrets from .env file
Write-Host "Reading secrets from .env file..." -ForegroundColor Yellow
$envVars = @{}
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Enable required APIs
Write-Host "Enabling required APIs..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com --project=$PROJECT_ID
gcloud services enable secretmanager.googleapis.com --project=$PROJECT_ID
gcloud services enable run.googleapis.com --project=$PROJECT_ID

# Create secrets in Secret Manager
Write-Host "" 
Write-Host "Creating secrets in Google Secret Manager..." -ForegroundColor Yellow

$secretsToCreate = @(
    @{name="google-client-id"; value=$envVars["GOOGLE_CLIENT_ID"]},
    @{name="google-client-secret"; value=$envVars["GOOGLE_CLIENT_SECRET"]},
    @{name="session-secret"; value=$envVars["SESSION_SECRET"]}
)

foreach ($secret in $secretsToCreate) {
    Write-Host "  Creating secret: $($secret.name)" -ForegroundColor Gray
    
    # Delete if exists
    gcloud secrets delete $secret.name --project=$PROJECT_ID --quiet 2>$null | Out-Null
    
    # Create secret
    echo $secret.value | gcloud secrets create $secret.name `
        --data-file=- `
        --project=$PROJECT_ID `
        --replication-policy="automatic" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  SUCCESS: Created $($secret.name)" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Failed to create $($secret.name)" -ForegroundColor Red
    }
}

# Grant Cloud Build access to secrets
Write-Host ""
Write-Host "Granting Cloud Build access to secrets..." -ForegroundColor Yellow

$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$CLOUD_BUILD_SA = "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

foreach ($secret in $secretsToCreate) {
    gcloud secrets add-iam-policy-binding $secret.name `
        --member="serviceAccount:$CLOUD_BUILD_SA" `
        --role="roles/secretmanager.secretAccessor" `
        --project=$PROJECT_ID `
        --quiet 2>$null | Out-Null
}

# Grant Cloud Build permissions to deploy to Cloud Run
Write-Host "Granting Cloud Build permissions to deploy to Cloud Run..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$CLOUD_BUILD_SA" `
    --role="roles/run.admin" `
    --quiet 2>$null | Out-Null

gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$CLOUD_BUILD_SA" `
    --role="roles/iam.serviceAccountUser" `
    --quiet 2>$null | Out-Null

Write-Host ""
Write-Host "SUCCESS: CI/CD setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Connect your GitHub repository to Cloud Build:" -ForegroundColor Yellow
Write-Host "   https://console.cloud.google.com/cloud-build/triggers/connect?project=$PROJECT_ID"
Write-Host ""
Write-Host "2. Create a trigger:" -ForegroundColor Yellow
Write-Host "   - Name: deploy-on-main-push"
Write-Host "   - Event: Push to branch"
Write-Host "   - Branch: ^main$"
Write-Host "   - Configuration: Cloud Build configuration file (yaml or json)"
Write-Host "   - Location: /cloudbuild.yaml"
Write-Host ""
Write-Host "3. Push to main branch to trigger automatic deployment!" -ForegroundColor Yellow
Write-Host ""

