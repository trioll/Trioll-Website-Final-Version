#!/bin/bash

# Direct fix for API Gateway CORS - Updates integration responses properly

echo "🔧 Direct API Gateway CORS Fix"
echo "=============================="

API_ID="4ib0hvu1xj"
REGION="us-east-1"

# Correct CORS headers including all custom headers
ALLOWED_HEADERS="'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source'"
ALLOWED_METHODS="'GET,POST,PUT,DELETE,OPTIONS'"
ALLOWED_ORIGINS="'*'"

echo "📋 Updating critical endpoints with proper CORS headers..."
echo ""

# Function to fix CORS for a specific resource
fix_cors_for_resource() {
    local RESOURCE_PATH=$1
    local RESOURCE_ID=$2
    
    echo "🔧 Fixing $RESOURCE_PATH"
    
    # Update OPTIONS integration response
    aws apigateway update-integration-response \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method OPTIONS \
        --status-code 200 \
        --patch-operations \
            "op=replace,path=/responseParameters/method.response.header.Access-Control-Allow-Headers,value=${ALLOWED_HEADERS}" \
            "op=replace,path=/responseParameters/method.response.header.Access-Control-Allow-Methods,value=${ALLOWED_METHODS}" \
            "op=replace,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value=${ALLOWED_ORIGINS}" \
        --region $REGION > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Updated OPTIONS for $RESOURCE_PATH"
    else
        echo "❌ Failed to update OPTIONS for $RESOURCE_PATH"
    fi
    
    # Also update actual method responses (GET, POST, etc)
    for METHOD in GET POST PUT DELETE; do
        # Check if method exists
        aws apigateway get-method \
            --rest-api-id $API_ID \
            --resource-id $RESOURCE_ID \
            --http-method $METHOD \
            --region $REGION > /dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            # Update integration response for the method
            aws apigateway update-integration-response \
                --rest-api-id $API_ID \
                --resource-id $RESOURCE_ID \
                --http-method $METHOD \
                --status-code 200 \
                --patch-operations \
                    "op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value=${ALLOWED_ORIGINS}" \
                    "op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Headers,value=${ALLOWED_HEADERS}" \
                    "op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Methods,value=${ALLOWED_METHODS}" \
                --region $REGION > /dev/null 2>&1
        fi
    done
}

# Get critical resource IDs
GAMES_RESOURCE=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/games`].id' --output text)
ANALYTICS_RESOURCE=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/analytics/events`].id' --output text)
SEARCH_RESOURCE=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/games/search`].id' --output text)
GAME_ID_RESOURCE=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/games/{gameId}`].id' --output text)

# Fix critical endpoints
fix_cors_for_resource "/games" "$GAMES_RESOURCE"
fix_cors_for_resource "/analytics/events" "$ANALYTICS_RESOURCE"
fix_cors_for_resource "/games/search" "$SEARCH_RESOURCE"
fix_cors_for_resource "/games/{gameId}" "$GAME_ID_RESOURCE"

echo ""
echo "🚀 Creating new deployment..."

# Deploy changes
DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Direct CORS fix with custom headers" \
    --region $REGION \
    --query 'id' \
    --output text)

if [ -n "$DEPLOYMENT_ID" ]; then
    echo "✅ Deployed successfully! (ID: $DEPLOYMENT_ID)"
    echo ""
    echo "⏰ Waiting 10 seconds for deployment to propagate..."
    sleep 10
    
    # Test the fix
    echo ""
    echo "🧪 Testing CORS headers..."
    echo ""
    curl -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games \
        -H "Origin: https://www.trioll.com" \
        -H "Access-Control-Request-Headers: x-platform,x-app-source,content-type,authorization" \
        -H "Access-Control-Request-Method: GET" \
        -s -I | grep -i "access-control"
else
    echo "❌ Deployment failed!"
fi

echo ""
echo "✅ Done! Please refresh your website and try again."