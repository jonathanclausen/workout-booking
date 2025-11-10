#!/bin/bash

# Deployment script for Arca Booking App to Google Cloud Run
# Bash version for Mac/Linux

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}[DEPLOY] Deploying Arca Booking App to Google Cloud Run${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}[ERROR] gcloud CLI not found. Please install it first:${NC}"
    echo "        https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}[ERROR] No GCP project set. Run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${GREEN}[INFO] Project: $PROJECT_ID${NC}"

# Load environment variables from .env file if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}[INFO] Loading environment variables from .env file...${NC}"
    
    # Export variables from .env, handling quotes properly
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue
        
        # Remove leading/trailing whitespace
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Remove quotes if present
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        
        export "$key=$value"
    done < .env
    
    echo -e "${GREEN}[SUCCESS] Environment variables loaded from .env${NC}"
else
    echo -e "${YELLOW}[WARNING] No .env file found - checking environment variables...${NC}"
fi

# Check for required environment variables
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ] || [ -z "$SESSION_SECRET" ]; then
    echo ""
    echo -e "${RED}[ERROR] Required environment variables not set!${NC}"
    echo ""
    echo -e "${YELLOW}Please create a .env file with:${NC}"
    echo "  GOOGLE_CLIENT_ID=your-client-id"
    echo "  GOOGLE_CLIENT_SECRET=your-client-secret"
    echo "  SESSION_SECRET=your-random-secret"
    echo ""
    echo -e "${YELLOW}Or set them in bash:${NC}"
    echo '  export GOOGLE_CLIENT_ID="your-client-id"'
    echo '  export GOOGLE_CLIENT_SECRET="your-client-secret"'
    echo '  export SESSION_SECRET="your-random-secret"'
    exit 1
fi

echo -e "${GREEN}All required environment variables are set${NC}"

# Display environment variables (with masked secrets)
echo ""
echo -e "${CYAN}Environment variables to deploy:${NC}"
echo -e "${GRAY}  NODE_ENV: production${NC}"
echo -e "${GRAY}  GOOGLE_CLOUD_PROJECT: $PROJECT_ID${NC}"
echo -e "${GRAY}  GOOGLE_CLIENT_ID: $GOOGLE_CLIENT_ID${NC}"
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    MASKED_SECRET="${GOOGLE_CLIENT_SECRET:0:10}..."
    echo -e "${GRAY}  GOOGLE_CLIENT_SECRET: $MASKED_SECRET${NC}"
fi
if [ -n "$SESSION_SECRET" ]; then
    MASKED_SESSION="${SESSION_SECRET:0:8}..."
    echo -e "${GRAY}  SESSION_SECRET: $MASKED_SESSION${NC}"
fi
echo -e "${GRAY}  ARCA_BASE_URL: https://backend.arca.dk${NC}"

echo ""
echo -e "${CYAN}Building and deploying...${NC}"

# Submit build
echo -e "${YELLOW}Building Docker image...${NC}"
gcloud builds submit --tag "gcr.io/$PROJECT_ID/arca-booking-app"

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

# Deploy to Cloud Run with environment variables
echo ""
echo -e "${YELLOW}Deploying to Cloud Run (cost-optimized)...${NC}"
gcloud run deploy arca-booking-app \
  --image "gcr.io/$PROJECT_ID/arca-booking-app" \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --concurrency 80 \
  --timeout 60 \
  --cpu-throttling \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
  --set-env-vars "GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID" \
  --set-env-vars "GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET" \
  --set-env-vars "SESSION_SECRET=$SESSION_SECRET" \
  --set-env-vars "ARCA_BASE_URL=https://backend.arca.dk"

if [ $? -ne 0 ]; then
    echo -e "${RED}Deployment failed!${NC}"
    exit 1
fi

# Get the service URL
SERVICE_URL=$(gcloud run services describe arca-booking-app --region us-central1 --format 'value(status.url)' 2>/dev/null)

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo -e "${CYAN}Your app is live at: $SERVICE_URL${NC}"
echo ""
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}IMPORTANT: Update Google OAuth Settings${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Go to: https://console.cloud.google.com/apis/credentials"
echo "2. Click on your OAuth 2.0 Client ID"
echo "3. Add this to 'Authorized redirect URIs':"
echo ""
echo -e "   ${GREEN}$SERVICE_URL/auth/google/callback${NC}"
echo ""
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  • Test your app: $SERVICE_URL"
echo "  • Set up cron job: ./scripts/setup-cron.sh"
echo ""

