# Test the Cloud Build pipeline locally
# This mimics what Cloud Build does

Write-Host "Testing Cloud Build pipeline locally..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Run backend tests (self-contained unit tests)
Write-Host "Step 1: Running backend tests..." -ForegroundColor Yellow
Push-Location backend
try {
    Copy-Item package.test.json package.json -Force
    npm install
    
    $env:NODE_ENV = "test"
    $env:SESSION_SECRET = "test-secret-key"
    $env:GOOGLE_CLIENT_ID = "test-client-id"
    $env:GOOGLE_CLIENT_SECRET = "test-client-secret"
    
    npm test
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Tests failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "SUCCESS: Tests passed!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Test step failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

Write-Host ""

# Step 2: Build frontend
Write-Host "Step 2: Building frontend..." -ForegroundColor Yellow
Push-Location frontend
try {
    npm install
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Frontend build failed!" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    Write-Host "SUCCESS: Frontend built!" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Frontend build step failed: $_" -ForegroundColor Red
    Pop-Location
    exit 1
} finally {
    Pop-Location
}

Write-Host ""

# Step 3: Build Docker image (optional - takes time)
Write-Host "Step 3: Building Docker image (optional)..." -ForegroundColor Yellow
Write-Host "Skipping Docker build for faster local testing" -ForegroundColor Gray
Write-Host "To test Docker build, run: docker build -t arca-test ." -ForegroundColor Gray

Write-Host ""
Write-Host "SUCCESS: Local build pipeline completed!" -ForegroundColor Green
Write-Host "Your changes are ready to push to trigger Cloud Build" -ForegroundColor Cyan

