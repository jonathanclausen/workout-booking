# test-docker.ps1
Write-Host "Building Docker image..." -ForegroundColor Cyan
docker build -t arca-booking-app .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green

# Check if port 8080 is in use
$portInUse = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Warning: Port 8080 is already in use!" -ForegroundColor Yellow
    Write-Host "Please stop your dev server (Ctrl+C in the terminal running 'npm run dev')" -ForegroundColor Yellow
    Write-Host "Or kill the process:" -ForegroundColor Yellow
    $process = Get-Process -Id $portInUse[0].OwningProcess
    Write-Host "  Process: $($process.Name) (PID: $($process.Id))" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Kill this process? (y/n)"
    if ($response -eq 'y') {
        Stop-Process -Id $process.Id -Force
        Write-Host "Process killed!" -ForegroundColor Green
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Using port 8081 instead..." -ForegroundColor Cyan
        $PORT = 8081
    }
} else {
    $PORT = 8080
}

Write-Host "Starting container..." -ForegroundColor Green

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

Write-Host "Starting container on http://localhost:$PORT" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow

# Get project ID
$PROJECT_ID = gcloud config get-value project 2>$null
if (-not $PROJECT_ID) {
    Write-Host "Warning: Could not get project ID from gcloud" -ForegroundColor Yellow
    $PROJECT_ID = "arca-booking-app-jcl"
}

# Check if service account key exists
$mountKey = ""
if (Test-Path "serviceAccountKey.json") {
    Write-Host "Found serviceAccountKey.json - mounting for Firestore access" -ForegroundColor Green
    $keyPath = (Resolve-Path "serviceAccountKey.json").Path
    $mountKey = "-v ${keyPath}:/app/serviceAccountKey.json"
    $credEnv = "-e GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json"
} else {
    Write-Host "Warning: serviceAccountKey.json not found - Firestore will not work!" -ForegroundColor Yellow
    Write-Host "Run: gcloud iam service-accounts keys create serviceAccountKey.json --iam-account=..." -ForegroundColor Yellow
    $credEnv = ""
}

# Build docker run command
$dockerCmd = "docker run -p ${PORT}:8080 " +
  "$mountKey " +
  "$credEnv " +
  "-e GOOGLE_CLIENT_ID=$env:GOOGLE_CLIENT_ID " +
  "-e GOOGLE_CLIENT_SECRET=$env:GOOGLE_CLIENT_SECRET " +
  "-e SESSION_SECRET=$env:SESSION_SECRET " +
  "-e GOOGLE_CLOUD_PROJECT=$PROJECT_ID " +
  "-e NODE_ENV=production " +
  "-e USE_SECURE_COOKIES=false " +
  "-e ARCA_BASE_URL=https://backend.arca.dk " +
  "arca-booking-app"

Invoke-Expression $dockerCmd