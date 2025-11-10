#!/bin/bash

# Script to intercept Arca app traffic

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}=== Intercept Arca App Traffic ===${NC}"

# Check if mitmproxy is installed
if ! command -v mitmproxy &> /dev/null; then
    echo -e "${YELLOW}mitmproxy not installed. Installing...${NC}"
    read -p "Install mitmproxy? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
        brew install mitmproxy
    else
        echo -e "${RED}Cannot proceed without mitmproxy${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}mitmproxy is installed${NC}"
echo ""
echo -e "${CYAN}=== Setup Instructions ===${NC}"
echo ""
echo "Step 1: Start the proxy"
echo "--------------------------------------"
echo "Running mitmproxy on port 8080..."
echo ""
echo -e "${YELLOW}In the mitmproxy interface:${NC}"
echo "  • Press 'f' to set filter"
echo "  • Type: ~d backend.arca.dk"
echo "  • This will show only Arca API calls"
echo ""
echo "---"
echo ""
echo "Step 2: Configure your iPhone"
echo "--------------------------------------"
echo "1. Get your Mac's IP address:"
IP_ADDRESS=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
if [ -n "$IP_ADDRESS" ]; then
    echo -e "   ${GREEN}Your Mac IP: $IP_ADDRESS${NC}"
else
    echo "   Run: ifconfig | grep 'inet ' | grep -v 127.0.0.1"
fi
echo ""
echo "2. On your iPhone:"
echo "   • Settings > Wi-Fi > (Your network) > Configure Proxy"
echo "   • Select 'Manual'"
echo "   • Server: $IP_ADDRESS (or your Mac's IP)"
echo "   • Port: 8080"
echo "   • Save"
echo ""
echo "3. Install mitmproxy certificate:"
echo "   • On iPhone, open Safari"
echo "   • Go to: http://mitm.it"
echo "   • Tap 'Get mitmproxy-ca-cert.pem'"
echo "   • Install the profile"
echo "   • Settings > General > About > Certificate Trust Settings"
echo "   • Enable full trust for mitmproxy"
echo ""
echo "---"
echo ""
echo "Step 3: Use the Arca app"
echo "--------------------------------------"
echo "1. Open the Arca app on your iPhone"
echo "3. Watch mitmproxy console for API calls"
echo ""
echo "---"
echo ""
echo -e "${GREEN}What to look for in mitmproxy:${NC}"
echo ""
echo "  • POST or GET requests during check-in"
echo "  • URL paths like:"
echo "    - /check_in"
echo "    - /participations/*/check_in"
echo "    - /react/check_in"
echo "    - /qr/scan"
echo ""
echo "  • Request payload (body)"
echo "  • Response data"
echo ""
echo "---"
echo ""
read -p "Ready to start mitmproxy? (y/n): " start
if [ "$start" != "y" ]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo -e "${CYAN}Starting mitmproxy...${NC}"
echo ""
echo -e "${YELLOW}Remember: Press 'f' and type '~d backend.arca.dk' to filter${NC}"
echo ""

# Start mitmproxy
mitmproxy --set console_focus_follow=true

