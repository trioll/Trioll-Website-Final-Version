#!/bin/bash

# Final fix - Delete and recreate OPTIONS integrations with correct CORS

echo "🔧 API Gateway CORS Final Fix - Delete and Recreate"
echo "=================================================="

API_ID="4ib0hvu1xj"
REGION="us-east-1"

# Full list of allowed headers
ALLOWED_HEADERS="Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source"

echo "📋 This will delete and recreate OPTIONS methods with proper CORS"
echo ""

# Function to recreate OPTIONS method with correct CORS
recreate_options_method() {
    local RESOURCE_ID=$1
    local RESOURCE_PATH=$2
    
    echo "🔧 Recreating OPTIONS for $RESOURCE_PATH"
    
    # Delete existing OPTIONS method if it exists
    aws apigateway delete-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --region $REGION > /dev/null 2>&1
    
    # Create new OPTIONS method
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region $REGION > /dev/null 2>&1
    
    # Create method response
    aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{
            "method.response.header.Access-Control-Allow-Headers": false,
            "method.response.header.Access-Control-Allow-Methods": false,
            "method.response.header.Access-Control-Allow-Origin": false
        }' \
        --region $REGION > /dev/null 2>&1
    
    # Create mock integration
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
        --region $REGION > /dev/null 2>&1
    
    # Create integration response with ALL headers
    aws apigateway put-integration-response \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters "{
            \"method.response.header.Access-Control-Allow-Headers\": \"'$ALLOWED_HEADERS'\",
            \"method.response.header.Access-Control-Allow-Methods\": \"'GET,POST,PUT,DELETE,OPTIONS'\",
            \"method.response.header.Access-Control-Allow-Origin\": \"'*'\"
        }" \
        --response-templates '{"application/json": ""}' \
        --region $REGION > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully recreated OPTIONS for $RESOURCE_PATH"
    else
        echo "❌ Failed to recreate OPTIONS for $RESOURCE_PATH"
    fi
}

# Get critical endpoints
echo "🔍 Finding critical endpoints..."
GAMES_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/games`].id' --output text)
ANALYTICS_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/analytics/events`].id' --output text)
SEARCH_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/games/search`].id' --output text)

# Recreate OPTIONS for critical endpoints
recreate_options_method "$GAMES_ID" "/games"
recreate_options_method "$ANALYTICS_ID" "/analytics/events"
recreate_options_method "$SEARCH_ID" "/games/search"

echo ""
echo "🚀 Deploying changes..."

# Deploy
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Recreated OPTIONS methods with correct CORS headers" \
    --region $REGION > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    
    echo ""
    echo "⏰ Waiting 15 seconds for changes to propagate..."
    sleep 15
    
    echo ""
    echo "🧪 Testing new CORS configuration..."
    echo ""
    
    echo "Testing /games endpoint:"
    curl -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games \
        -H "Origin: https://www.trioll.com" \
        -H "Access-Control-Request-Headers: x-platform,x-app-source,content-type" \
        -H "Access-Control-Request-Method: GET" \
        -s -I | grep -i "access-control" | head -3
    
    echo ""
    echo "Headers should now include:"
    echo "✓ X-Platform"
    echo "✓ X-App-Source"
    echo "✓ X-Guest-Mode"
    echo "✓ X-Identity-Id"
else
    echo "❌ Deployment failed!"
fi

echo ""
echo "🎯 Please hard refresh your browser (Ctrl+Shift+R) and try again!"