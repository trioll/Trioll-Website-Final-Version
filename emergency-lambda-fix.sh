#!/bin/bash

# Emergency fix - restore Lambda functions to working state

echo "🚨 EMERGENCY Lambda Function Restore"
echo "===================================="

REGION="us-east-1"

# Map of Lambda functions to their expected handler files
declare -A LAMBDA_HANDLERS=(
    ["trioll-prod-games-api"]="games-api.js"
    ["trioll-prod-analytics-api"]="analytics-api.js"
    ["trioll-prod-users-api"]="users-api.js"
    ["trioll-prod-interactions-api"]="index.js"
)

for FUNCTION_NAME in "${!LAMBDA_HANDLERS[@]}"; do
    HANDLER_FILE="${LAMBDA_HANDLERS[$FUNCTION_NAME]}"
    echo ""
    echo "🔧 Fixing $FUNCTION_NAME..."
    
    # Create a temporary directory
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download the current broken deployment
    aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Code.Location' --output text | xargs curl -s -o function.zip
    
    # Extract
    unzip -q function.zip
    
    # Find any .js file that might be our handler
    FOUND_FILE=$(find . -name "*.js" -type f | head -1)
    
    if [ -n "$FOUND_FILE" ] && [ "$FOUND_FILE" != "./$HANDLER_FILE" ]; then
        echo "  📋 Renaming $FOUND_FILE to $HANDLER_FILE"
        mv "$FOUND_FILE" "$HANDLER_FILE"
    fi
    
    # Ensure the handler file exists and has proper CORS
    if [ -f "$HANDLER_FILE" ]; then
        echo "  ✅ Found $HANDLER_FILE, checking CORS..."
        
        # Check if CORS headers are properly formatted
        if grep -q "const CORS_HEADERS = {" "$HANDLER_FILE"; then
            # Extract everything before CORS_HEADERS
            sed -n '1,/const CORS_HEADERS = {/p' "$HANDLER_FILE" | sed '$d' > temp_top.js
            
            # Add correct CORS headers
            cat >> temp_top.js << 'EOF'
// CORS Headers Configuration
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
};
EOF
            
            # Extract everything after the broken CORS section
            # Find the line after the last closing brace of CORS_HEADERS
            awk '
                /const CORS_HEADERS = {/ { in_cors = 1; next }
                in_cors && /^};/ { in_cors = 0; next }
                !in_cors && found_end { print }
                !in_cors && !found_end && /^}/ { found_end = 1; next }
                !in_cors && found_end { print }
            ' "$HANDLER_FILE" >> temp_top.js
            
            # Replace the original file
            mv temp_top.js "$HANDLER_FILE"
        fi
        
        # Repackage
        zip -qr fixed.zip .
        
        # Deploy
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file fileb://fixed.zip \
            --region $REGION > /dev/null
        
        if [ $? -eq 0 ]; then
            echo "  ✅ Successfully restored $FUNCTION_NAME"
        else
            echo "  ❌ Failed to restore $FUNCTION_NAME"
        fi
    else
        echo "  ❌ Could not find handler file!"
    fi
    
    # Cleanup
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
done

echo ""
echo "🧪 Testing endpoints..."
echo ""

# Wait for Lambda to stabilize
sleep 5

# Test games endpoint
echo "Testing /games:"
RESPONSE=$(curl -s -w "\n%{http_code}" https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games?limit=1 -H "Origin: https://www.trioll.com")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Games endpoint is working!"
else
    echo "❌ Games endpoint still failing"
fi

echo ""
echo "Testing /analytics/events OPTIONS:"
RESPONSE=$(curl -s -I -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/analytics/events -H "Origin: https://www.trioll.com" | grep -i "access-control")
echo "$RESPONSE"

echo ""
echo "🏁 Emergency fix complete. Please refresh your website!"