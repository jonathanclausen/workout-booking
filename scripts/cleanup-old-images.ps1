# Clean up old Docker images from Container Registry
# Keeps only the latest 5 images to save storage costs

Write-Host "Cleaning up old Docker images..." -ForegroundColor Cyan

$PROJECT_ID = gcloud config get-value project 2>$null

if (-not $PROJECT_ID) {
    Write-Host "ERROR: No GCP project set" -ForegroundColor Red
    exit 1
}

$IMAGE_NAME = "arca-booking-app"
$KEEP_LATEST = 5

Write-Host "Project: $PROJECT_ID" -ForegroundColor Green
Write-Host "Image: $IMAGE_NAME" -ForegroundColor Green
Write-Host "Keeping latest: $KEEP_LATEST images" -ForegroundColor Green
Write-Host ""

# Get all image tags sorted by timestamp
$allTags = gcloud container images list-tags "gcr.io/$PROJECT_ID/$IMAGE_NAME" `
    --format="get(digest,timestamp)" `
    --sort-by=~timestamp

$tagList = $allTags -split "`n" | Where-Object { $_ -ne "" }

Write-Host "Found $($tagList.Count) images" -ForegroundColor Yellow

if ($tagList.Count -le $KEEP_LATEST) {
    Write-Host "Nothing to delete (only $($tagList.Count) images exist)" -ForegroundColor Green
    exit 0
}

$toDelete = $tagList | Select-Object -Skip $KEEP_LATEST

Write-Host "Deleting $($toDelete.Count) old images..." -ForegroundColor Yellow

foreach ($tag in $toDelete) {
    $digest = ($tag -split "\s+")[0]
    Write-Host "  Deleting: $digest" -ForegroundColor Gray
    gcloud container images delete "gcr.io/$PROJECT_ID/$IMAGE_NAME@$digest" --quiet 2>$null
}

Write-Host ""
Write-Host "SUCCESS: Cleanup complete!" -ForegroundColor Green
Write-Host "Kept latest $KEEP_LATEST images, deleted $($toDelete.Count) old images" -ForegroundColor Cyan

