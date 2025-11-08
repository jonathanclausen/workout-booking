# Setup Budget Alert for Arca Booking App
# Protects against unexpected cloud costs

Write-Host "Setting up budget alert for Arca Booking App" -ForegroundColor Cyan
Write-Host ""

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "[ERROR] No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Project: $PROJECT_ID" -ForegroundColor Green

# Get billing account
Write-Host ""
Write-Host "Fetching billing account..." -ForegroundColor Yellow
$BILLING_ACCOUNTS = gcloud billing accounts list --format="value(name)" 2>$null

if (-not $BILLING_ACCOUNTS) {
    Write-Host "[ERROR] No billing account found or not accessible" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set up billing manually:" -ForegroundColor Yellow
    Write-Host "1. Go to: https://console.cloud.google.com/billing" -ForegroundColor White
    Write-Host "2. Link a billing account to your project" -ForegroundColor White
    Write-Host "3. Then run this script again" -ForegroundColor White
    exit 1
}

# Use first billing account if multiple
$BILLING_ACCOUNT = ($BILLING_ACCOUNTS -split "`n")[0]
Write-Host "[INFO] Using billing account: $BILLING_ACCOUNT" -ForegroundColor Green

# Check if budget CLI is available (requires beta component)
$HAS_BETA = gcloud components list --filter="id:beta" --format="value(state.name)" 2>$null
if ($HAS_BETA -ne "Installed") {
    Write-Host ""
    Write-Host "[INFO] The 'gcloud beta billing budgets' command requires the beta component" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Two options to create budget alert:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OPTION 1: Use Web Console (Recommended - Easier)" -ForegroundColor Green
    Write-Host "1. Go to: https://console.cloud.google.com/billing/budgets" -ForegroundColor White
    Write-Host "2. Click 'CREATE BUDGET'" -ForegroundColor White
    Write-Host "3. Configure:" -ForegroundColor White
    Write-Host "   - Name: Arca Booking App Budget" -ForegroundColor Gray
    Write-Host "   - Amount: `$5.00 per month" -ForegroundColor Gray
    Write-Host "   - Threshold alerts: 50%, 90%, 100%" -ForegroundColor Gray
    Write-Host "   - Add your email for notifications" -ForegroundColor Gray
    Write-Host ""
    Write-Host "OPTION 2: Install Beta Component" -ForegroundColor Green
    Write-Host "Run: gcloud components install beta" -ForegroundColor White
    Write-Host "Then run this script again" -ForegroundColor White
    Write-Host ""
    exit 0
}

# Create budget using beta command
Write-Host ""
Write-Host "Creating budget alert..." -ForegroundColor Yellow

# Budget amount in USD
$BUDGET_AMOUNT = 5

try {
    gcloud beta billing budgets create `
        --billing-account=$BILLING_ACCOUNT `
        --display-name="Arca Booking App Budget" `
        --budget-amount=$BUDGET_AMOUNT `
        --threshold-rule=percent=0.5 `
        --threshold-rule=percent=0.9 `
        --threshold-rule=percent=1.0 `
        --filter-projects="projects/$PROJECT_ID" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Budget alert created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Budget Configuration:" -ForegroundColor Cyan
        Write-Host "  Monthly Budget: `$$BUDGET_AMOUNT" -ForegroundColor White
        Write-Host "  Alerts at: 50% (`$2.50), 90% (`$4.50), 100% (`$5.00)" -ForegroundColor White
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Go to: https://console.cloud.google.com/billing/budgets" -ForegroundColor White
        Write-Host "2. Click on 'Arca Booking App Budget'" -ForegroundColor White
        Write-Host "3. Add email recipients for alerts" -ForegroundColor White
        Write-Host ""
        Write-Host "You'll receive email notifications when spending crosses thresholds." -ForegroundColor Yellow
    } else {
        throw "Budget creation failed"
    }
} catch {
    Write-Host ""
    Write-Host "[WARNING] Could not create budget via CLI" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please create budget manually:" -ForegroundColor Cyan
    Write-Host "1. Go to: https://console.cloud.google.com/billing/budgets" -ForegroundColor White
    Write-Host "2. Click 'CREATE BUDGET'" -ForegroundColor White
    Write-Host "3. Configure:" -ForegroundColor White
    Write-Host "   - Name: Arca Booking App Budget" -ForegroundColor Gray
    Write-Host "   - Amount: `$5.00 per month" -ForegroundColor Gray
    Write-Host "   - Threshold alerts: 50%, 90%, 100%" -ForegroundColor Gray
    Write-Host "   - Add your email for notifications" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "For more cost optimization details, see: COST-OPTIMIZATION.md" -ForegroundColor Cyan
Write-Host ""

