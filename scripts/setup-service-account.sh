#!/bin/bash

# Setup Service Account for Local Development and Docker Testing

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}Setting up Service Account for local Firestore access...${NC}"

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: No GCP project set${NC}"
    echo -e "${YELLOW}Run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${GREEN}Project: $PROJECT_ID${NC}"

SERVICE_ACCOUNT="arca-booking-dev"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT@$PROJECT_ID.iam.gserviceaccount.com"

# Check if service account exists
echo -e "${YELLOW}Checking if service account exists...${NC}"
EXISTING_ACCOUNT=$(gcloud iam service-accounts list --filter="email:$SERVICE_ACCOUNT_EMAIL" --format="value(email)" 2>/dev/null)

if [ -n "$EXISTING_ACCOUNT" ]; then
    echo -e "${GREEN}Service account already exists: $SERVICE_ACCOUNT_EMAIL${NC}"
else
    echo -e "${YELLOW}Creating service account...${NC}"
    gcloud iam service-accounts create $SERVICE_ACCOUNT \
        --display-name="Arca Booking Dev Account"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create service account${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Service account created!${NC}"
fi

# Grant Firestore permissions
echo -e "${YELLOW}Granting Firestore permissions...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/datastore.user" \
    --condition=None 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Permissions granted!${NC}"
fi

# Download service account key
if [ -f "serviceAccountKey.json" ]; then
    echo ""
    echo -e "${YELLOW}serviceAccountKey.json already exists!${NC}"
    read -p "Overwrite? (y/n): " response
    if [ "$response" != "y" ]; then
        echo -e "${GREEN}Keeping existing key file.${NC}"
        exit 0
    fi
    rm serviceAccountKey.json
fi

echo -e "${YELLOW}Downloading service account key...${NC}"
gcloud iam service-accounts keys create serviceAccountKey.json \
    --iam-account=$SERVICE_ACCOUNT_EMAIL

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create key${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Success! Service account key created.${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Run local dev server: npm run dev"
echo "  2. Or test Docker: ./scripts/test-docker.sh"
echo ""
echo -e "${YELLOW}Note: serviceAccountKey.json is in .gitignore and will NOT be committed${NC}"
echo ""

