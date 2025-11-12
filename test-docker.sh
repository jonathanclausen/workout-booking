#!/bin/bash

# test-docker.sh - Test Docker build locally on Mac

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Building Docker image...${NC}"
docker build -t arca-booking-app .

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Build successful!${NC}"

# Check if port 8080 is in use
PORT=8080
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}Warning: Port 8080 is already in use!${NC}"
    echo -e "${YELLOW}Please stop your dev server (Ctrl+C in the terminal running 'npm run dev')${NC}"
    echo -e "${YELLOW}Or kill the process:${NC}"
    
    PID=$(lsof -Pi :8080 -sTCP:LISTEN -t)
    PROC=$(ps -p $PID -o comm= 2>/dev/null)
    echo -e "${YELLOW}  Process: $PROC (PID: $PID)${NC}"
    echo ""
    
    read -p "Kill this process? (y/n): " response
    if [ "$response" = "y" ]; then
        kill -9 $PID
        echo -e "${GREEN}Process killed!${NC}"
        sleep 2
    else
        echo -e "${CYAN}Using port 8081 instead...${NC}"
        PORT=8081
    fi
fi

echo -e "${GREEN}Starting container...${NC}"

# Load environment variables from .env
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Get project ID
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}Warning: Could not get project ID from gcloud${NC}"
    PROJECT_ID="arca-booking-app-jcl"
fi

# Check if service account key exists
MOUNT_KEY=""
CRED_ENV=""
if [ -f "serviceAccountKey.json" ]; then
    echo -e "${GREEN}Found serviceAccountKey.json - mounting for Firestore access${NC}"
    KEY_PATH="$(pwd)/serviceAccountKey.json"
    MOUNT_KEY="-v ${KEY_PATH}:/app/serviceAccountKey.json"
    CRED_ENV="-e GOOGLE_APPLICATION_CREDENTIALS=/app/serviceAccountKey.json"
else
    echo -e "${YELLOW}Warning: serviceAccountKey.json not found - Firestore will not work!${NC}"
    echo -e "${YELLOW}Run: ./scripts/setup-service-account.sh${NC}"
fi

echo -e "${GREEN}Starting container on http://localhost:$PORT${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Run the container
docker run -p ${PORT}:8080 \
  ${MOUNT_KEY} \
  ${CRED_ENV} \
  -e GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID}" \
  -e GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET}" \
  -e SESSION_SECRET="${SESSION_SECRET}" \
  -e GOOGLE_CLOUD_PROJECT="${PROJECT_ID}" \
  -e NODE_ENV=production \
  -e USE_SECURE_COOKIES=false \
  -e ARCA_BASE_URL=https://backend.arca.dk \
  arca-booking-app

