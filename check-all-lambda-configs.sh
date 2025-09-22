#!/bin/bash

# Comprehensive check of all Lambda configurations vs API Gateway

echo "🔍 Comprehensive Lambda & API Gateway Configuration Check"
echo "========================================================"

REGION="us-east-1"
API_ID="4ib0hvu1xj"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "\n${BLUE}=== Lambda Function Configurations ===${NC}"
echo ""

# Check all Lambda functions
LAMBDA_FUNCTIONS=(
    "trioll-prod-games-api"
    "trioll-prod-users-api"
    "trioll-prod-interactions-api"
    "trioll-prod-analytics-api"
    "trioll-prod-analytics-processor"
    "trioll-prod-search-games"
    "trioll-prod-websocket-connect"
    "trioll-prod-websocket-disconnect"
    "trioll-prod-websocket-message"
)

for FUNCTION in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -e "${YELLOW}📦 $FUNCTION${NC}"
    
    # Get function configuration
    CONFIG=$(aws lambda get-function-configuration \
        --function-name $FUNCTION \
        --region $REGION \
        --query '[Handler,Runtime,State,LastUpdateStatus]' \
        --output text 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        IFS=$'\t' read -r HANDLER RUNTIME STATE UPDATE_STATUS <<< "$CONFIG"
        
        # Check state
        if [ "$STATE" == "Active" ] && [ "$UPDATE_STATUS" == "Successful" ]; then
            echo -e "  ${GREEN}✓ State: $STATE${NC}"
        else
            echo -e "  ${RED}✗ State: $STATE, Update: $UPDATE_STATUS${NC}"
        fi
        
        echo "  Handler: $HANDLER"
        echo "  Runtime: $RUNTIME"
        
        # Check if handler file matches function name pattern
        EXPECTED_HANDLER=""
        case $FUNCTION in
            *-games-api) EXPECTED_HANDLER="games-api.handler" ;;
            *-users-api) EXPECTED_HANDLER="users-api.handler" ;;
            *-interactions-api) EXPECTED_HANDLER="index.handler" ;;
            *-analytics-api) EXPECTED_HANDLER="analytics-api.handler" ;;
            *-analytics-processor) EXPECTED_HANDLER="analytics-processor.handler" ;;
            *-search-games) EXPECTED_HANDLER="search-games*.handler" ;;
        esac
        
        if [[ -n "$EXPECTED_HANDLER" && "$HANDLER" == $EXPECTED_HANDLER* ]]; then
            echo -e "  ${GREEN}✓ Handler matches expected pattern${NC}"
        elif [ -n "$EXPECTED_HANDLER" ]; then
            echo -e "  ${YELLOW}⚠ Handler mismatch. Expected: $EXPECTED_HANDLER, Got: $HANDLER${NC}"
        fi
        
        # Test the function
        echo -n "  Testing function... "
        TEST_PAYLOAD='{"httpMethod":"OPTIONS","path":"/test"}'
        RESULT=$(aws lambda invoke \
            --function-name $FUNCTION \
            --payload "$TEST_PAYLOAD" \
            --region $REGION \
            /tmp/lambda-test-output.json 2>&1)
        
        if [ $? -eq 0 ]; then
            # Check if response has CORS headers
            if grep -q "Access-Control-Allow-Origin" /tmp/lambda-test-output.json 2>/dev/null; then
                echo -e "${GREEN}✓ Returns CORS headers${NC}"
            else
                echo -e "${YELLOW}⚠ No CORS headers in response${NC}"
            fi
        else
            echo -e "${RED}✗ Function invocation failed${NC}"
        fi
    else
        echo -e "  ${RED}✗ Function not found or inaccessible${NC}"
    fi
    echo ""
done

echo -e "\n${BLUE}=== API Gateway Integration Check ===${NC}"
echo ""

# Get API Gateway integrations
echo "Checking API Gateway integrations..."

# Key endpoints to check
ENDPOINTS=(
    "/games:GET"
    "/games:POST"
    "/games/{gameId}:GET"
    "/games/{gameId}/likes:POST"
    "/games/{gameId}/likes:DELETE"
    "/analytics/events:POST"
    "/users/profile:GET"
    "/users/{userId}:GET"
    "/users/{userId}:PUT"
)

for ENDPOINT in "${ENDPOINTS[@]}"; do
    IFS=':' read -r PATH METHOD <<< "$ENDPOINT"
    
    echo -e "\n${YELLOW}🌐 $METHOD $PATH${NC}"
    
    # Get resource ID
    if [[ "$PATH" == *"{"* ]]; then
        # Path with parameters - use a simpler query
        RESOURCE_ID=$(aws apigateway get-resources \
            --rest-api-id $API_ID \
            --region $REGION \
            --query "items[?contains(path,'$(echo $PATH | cut -d'{' -f1)')].id" \
            --output text | head -1)
    else
        RESOURCE_ID=$(aws apigateway get-resources \
            --rest-api-id $API_ID \
            --region $REGION \
            --query "items[?path=='$PATH'].id" \
            --output text)
    fi
    
    if [ -n "$RESOURCE_ID" ]; then
        # Get integration
        INTEGRATION=$(aws apigateway get-integration \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $METHOD \
            --region $REGION 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            INTEGRATION_TYPE=$(echo "$INTEGRATION" | grep -o '"type": "[^"]*"' | cut -d'"' -f4)
            URI=$(echo "$INTEGRATION" | grep -o '"uri": "[^"]*"' | cut -d'"' -f4)
            
            echo "  Integration: $INTEGRATION_TYPE"
            
            if [[ "$URI" == *"lambda"* ]]; then
                LAMBDA_NAME=$(echo "$URI" | grep -o 'function:[^/]*' | cut -d: -f2)
                echo -e "  Lambda: ${GREEN}$LAMBDA_NAME${NC}"
            fi
        else
            echo -e "  ${RED}✗ No integration configured${NC}"
        fi
    else
        echo -e "  ${YELLOW}⚠ Resource not found${NC}"
    fi
done

echo -e "\n${BLUE}=== Live Endpoint Tests ===${NC}"
echo ""

# Test actual endpoints
echo "Testing live endpoints..."

# Test games endpoint
echo -e "\n${YELLOW}1. GET /games${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games?limit=1)
if [ "$RESPONSE" == "200" ]; then
    echo -e "   ${GREEN}✓ Status: $RESPONSE${NC}"
else
    echo -e "   ${RED}✗ Status: $RESPONSE${NC}"
fi

# Test OPTIONS for CORS
echo -e "\n${YELLOW}2. OPTIONS /games (CORS)${NC}"
CORS_HEADERS=$(curl -s -I -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games \
    -H "Origin: https://www.trioll.com" \
    -H "Access-Control-Request-Headers: x-platform,x-app-source" \
    | grep -i "access-control-allow")

if [[ "$CORS_HEADERS" == *"X-Platform"* ]]; then
    echo -e "   ${GREEN}✓ CORS headers include custom headers${NC}"
    echo "   $CORS_HEADERS"
else
    echo -e "   ${RED}✗ CORS headers missing custom headers${NC}"
    echo "   $CORS_HEADERS"
fi

# Test analytics endpoint
echo -e "\n${YELLOW}3. POST /analytics/events${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/analytics/events \
    -H "Content-Type: application/json" \
    -H "X-App-Source: web" \
    -d '{"events":[{"type":"test"}]}')
    
if [[ "$RESPONSE" == "200" || "$RESPONSE" == "202" ]]; then
    echo -e "   ${GREEN}✓ Status: $RESPONSE${NC}"
else
    echo -e "   ${RED}✗ Status: $RESPONSE${NC}"
fi

echo -e "\n${BLUE}=== Summary ===${NC}"
echo ""
echo "Check complete! Review the output above for any issues."
echo "Look for:"
echo "- ${RED}Red ✗${NC} marks indicating failures"
echo "- ${YELLOW}Yellow ⚠${NC} marks indicating warnings"
echo "- ${GREEN}Green ✓${NC} marks indicating success"
echo ""
echo "If Lambda functions show handler mismatches or invocation failures,"
echo "run the emergency-lambda-fix.sh script to restore them."