# Deploy Firestore Security Rules

Write-Host "Deploying Firestore security rules..." -ForegroundColor Cyan

# Check if gcloud is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "gcloud CLI not found." -ForegroundColor Red
    exit 1
}

# Check if firestore.rules exists
if (-not (Test-Path "firestore.rules")) {
    Write-Host "firestore.rules file not found!" -ForegroundColor Red
    exit 1
}

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Project: $PROJECT_ID" -ForegroundColor Green
Write-Host ""
Write-Host "Deploying rules from firestore.rules..." -ForegroundColor Yellow

# Deploy the rules
gcloud firestore databases update --database='(default)' --rules-file=firestore.rules

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Firestore security rules deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "View your rules at:" -ForegroundColor Cyan
    Write-Host "https://console.firebase.google.com/project/$PROJECT_ID/firestore/rules" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Failed to deploy Firestore rules!" -ForegroundColor Red
    exit 1
}


