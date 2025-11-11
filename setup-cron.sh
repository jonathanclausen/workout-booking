#!/bin/bash

# Setup Cloud Scheduler for automatic booking checks

set -e

echo "⏰ Setting up Cloud Scheduler for Arca Booking App"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found."
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project)
REGION="us-central1"

# Get Cloud Run service URL
SERVICE_URL=$(gcloud run services describe arca-booking-app --region $REGION --format 'value(status.url)')

if [ -z "$SERVICE_URL" ]; then
    echo "❌ Cloud Run service 'arca-booking-app' not found. Deploy it first."
    exit 1
fi

echo "📦 Project: $PROJECT_ID"
echo "🌐 Service URL: $SERVICE_URL"

# Delete existing job if it exists
gcloud scheduler jobs delete booking-check-job --location=$REGION --quiet 2>/dev/null || true

# Create new scheduler job (runs every morning at 6 AM Copenhagen time)
gcloud scheduler jobs create http booking-check-job \
  --schedule="0 6 * * *" \
  --time-zone="Europe/Copenhagen" \
  --uri="$SERVICE_URL/cron/check-bookings" \
  --http-method=POST \
  --location=$REGION \
  --headers="X-Cloudscheduler=true" \
  --description="Check and book Arca classes automatically every morning at 6:00 AM Copenhagen time"

echo "✅ Cloud Scheduler job created!"
echo "⏰ The app will check for bookings every morning at 6:00 AM Copenhagen time"
echo ""
echo "📝 You can view the job at:"
echo "   https://console.cloud.google.com/cloudscheduler?project=$PROJECT_ID"
echo ""
echo "To manually trigger the job:"
echo "   gcloud scheduler jobs run booking-check-job --location=$REGION"

