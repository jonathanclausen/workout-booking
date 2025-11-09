# Setup Service Account for Local Development and Docker Testing

Write-Host "Setting up Service Account for local Firestore access..." -ForegroundColor Cyan

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "Error: No GCP project set" -ForegroundColor Red
    Write-Host "Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Yellow
    exit 1
}

Write-Host "Project: $PROJECT_ID" -ForegroundColor Green

$SERVICE_ACCOUNT = "arca-booking-dev"
$SERVICE_ACCOUNT_EMAIL = "$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"

# Check if service account exists
Write-Host "Checking if service account exists..." -ForegroundColor Yellow
$existingAccount = gcloud iam service-accounts list --filter="email:$SERVICE_ACCOUNT_EMAIL" --format="value(email)" 2>$null

if ($existingAccount) {
    Write-Host "Service account already exists: $SERVICE_ACCOUNT_EMAIL" -ForegroundColor Green
} else {
    Write-Host "Creating service account..." -ForegroundColor Yellow
    gcloud iam service-accounts create $SERVICE_ACCOUNT `
        --display-name="Arca Booking Dev Account"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to create service account" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Service account created!" -ForegroundColor Green
}

# Grant Firestore permissions
Write-Host "Granting Firestore permissions..." -ForegroundColor Yellow
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" `
    --role="roles/datastore.user" `
    --condition=None 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Permissions granted!" -ForegroundColor Green
}

# Download service account key
if (Test-Path "serviceAccountKey.json") {
    Write-Host ""
    Write-Host "serviceAccountKey.json already exists!" -ForegroundColor Yellow
    $response = Read-Host "Overwrite? (y/n)"
    if ($response -ne 'y') {
        Write-Host "Keeping existing key file." -ForegroundColor Green
        exit 0
    }
    Remove-Item "serviceAccountKey.json"
}

Write-Host "Downloading service account key..." -ForegroundColor Yellow
gcloud iam service-accounts keys create serviceAccountKey.json `
    --iam-account=$SERVICE_ACCOUNT_EMAIL

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create key" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Success! Service account key created." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run local dev server: npm run dev"
Write-Host "  2. Or test Docker: .\test-docker.ps1"
Write-Host ""
Write-Host "Note: serviceAccountKey.json is in .gitignore and will NOT be committed" -ForegroundColor Yellow
Write-Host ""

