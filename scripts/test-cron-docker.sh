#!/bin/bash

# Test cron endpoint on Docker container

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}=== Testing Cron Endpoint (Docker) ===${NC}"
echo ""

# Check which port the container is running on
PORT=8080
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${YELLOW}Port 8080 not responding, trying 8081...${NC}"
    PORT=8081
    if ! curl -s http://localhost:8081/health > /dev/null 2>&1; then
        echo -e "${RED}Error: Docker container is not running${NC}"
        echo ""
        echo "Start it with: ./test-docker.sh"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Container is running on port $PORT${NC}"
echo ""

echo -e "${YELLOW}Triggering booking check endpoint...${NC}"
echo ""

# Trigger the cron endpoint
RESPONSE=$(curl -s -X POST http://localhost:$PORT/cron/check-bookings \
    -H "Content-Type: application/json" \
    -H "X-Cloudscheduler: true" \
    -w "\n%{http_code}")

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo -e "${CYAN}Response (Status: $HTTP_CODE):${NC}"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"

echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Cron job executed successfully${NC}"
else
    echo -e "${RED}✗ Request failed with status $HTTP_CODE${NC}"
fi

echo ""
echo -e "${YELLOW}Check Docker container logs for detailed output:${NC}"
echo "  docker logs \$(docker ps -q --filter ancestor=arca-booking-app)"
echo ""

