#!/bin/bash

# Setup Environment Variables Helper Script

# Color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Environment Setup Helper ===${NC}"
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}.env file already exists!${NC}"
    read -p "Do you want to overwrite it? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo -e "${GREEN}Keeping existing .env file${NC}"
        exit 0
    fi
    echo ""
fi

# Get Google Cloud Project ID
echo -e "${CYAN}Step 1: Getting Google Cloud Project ID...${NC}"
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}No GCP project configured in gcloud${NC}"
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    if [ -z "$PROJECT_ID" ]; then
        echo -e "${RED}Error: Project ID is required${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}Found project: $PROJECT_ID${NC}"
fi
echo ""

# Generate Session Secret
echo -e "${CYAN}Step 2: Generating secure session secret...${NC}"
SESSION_SECRET=$(openssl rand -base64 32)
echo -e "${GREEN}Session secret generated${NC}"
echo ""

# Get Google OAuth Credentials
echo -e "${CYAN}Step 3: Google OAuth Credentials${NC}"
echo -e "${YELLOW}You need to create OAuth 2.0 credentials at:${NC}"
echo -e "  https://console.cloud.google.com/apis/credentials?project=$PROJECT_ID"
echo ""
echo -e "${YELLOW}Instructions:${NC}"
echo "  1. Click 'Create Credentials' → 'OAuth 2.0 Client ID'"
echo "  2. Application type: 'Web application'"
echo "  3. Add authorized redirect URI: http://localhost:8080/auth/google/callback"
echo "  4. Copy the Client ID and Client Secret"
echo ""

read -p "Have you created the OAuth credentials? (y/n): " oauth_ready
if [ "$oauth_ready" != "y" ]; then
    echo -e "${YELLOW}Please create the OAuth credentials first, then run this script again${NC}"
    exit 0
fi
echo ""

read -p "Enter your Google Client ID: " GOOGLE_CLIENT_ID
if [ -z "$GOOGLE_CLIENT_ID" ]; then
    echo -e "${RED}Error: Google Client ID is required${NC}"
    exit 1
fi

read -p "Enter your Google Client Secret: " GOOGLE_CLIENT_SECRET
if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${RED}Error: Google Client Secret is required${NC}"
    exit 1
fi
echo ""

# Create .env file
echo -e "${CYAN}Step 4: Creating .env file...${NC}"

cat > .env << EOF
# Server Configuration
PORT=8080
NODE_ENV=development

# Session Secret
SESSION_SECRET=$SESSION_SECRET

# Google Cloud Project
GOOGLE_CLOUD_PROJECT=$PROJECT_ID

# Google OAuth Credentials
GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET

# Optional: Override callback URL (usually not needed for local dev)
# GOOGLE_CALLBACK_URL=http://localhost:8080/auth/google/callback

# Arca API Configuration
ARCA_BASE_URL=https://backend.arca.dk

# Cookie Configuration (for Docker testing)
# USE_SECURE_COOKIES=false

# Firebase/Firestore (uses serviceAccountKey.json in development)
# GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
EOF

echo -e "${GREEN}✓ .env file created successfully!${NC}"
echo ""

# Verify serviceAccountKey.json exists
if [ ! -f "serviceAccountKey.json" ]; then
    echo -e "${YELLOW}Warning: serviceAccountKey.json not found${NC}"
    echo -e "Run: ${CYAN}./scripts/setup-service-account.sh${NC} to create it"
    echo ""
fi

echo -e "${GREEN}=== Setup Complete! ===${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "  1. Install dependencies: npm install"
echo "  2. Install frontend dependencies: cd frontend && npm install"
echo "  3. Start development server: npm run dev"
echo ""
echo -e "${YELLOW}Note: .env is in .gitignore and will NOT be committed${NC}"
echo ""

