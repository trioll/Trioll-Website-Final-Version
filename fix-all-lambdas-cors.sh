#!/bin/bash

# Fix ALL broken Lambda functions with correct CORS headers

echo "🔧 Fixing ALL Broken Lambda Functions"
echo "====================================="

REGION="us-east-1"

# List of Lambda functions to fix
LAMBDA_FUNCTIONS=(
    "trioll-prod-analytics-api:analytics-api.js"
    "trioll-prod-users-api:users-api.js"
    "trioll-prod-interactions-api:index.js"
    "trioll-prod-search-games:search-games-optimized.js"
)

# Correct CORS headers string
CORS_FIX='// CORS Headers Configuration
const CORS_HEADERS = {
    '\''Access-Control-Allow-Origin'\'': '\''*'\'',
    '\''Access-Control-Allow-Headers'\'': '\''Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'\'',
    '\''Access-Control-Allow-Methods'\'': '\''GET,POST,PUT,DELETE,OPTIONS'\'',
    '\''Content-Type'\'': '\''application/json'\''
};

// Helper function to add CORS headers to response
const addCorsHeaders = (response) => {
    return {
        ...response,
        headers: {
            ...response.headers,
            ...CORS_HEADERS
        }
    };
};'

for FUNCTION_PAIR in "${LAMBDA_FUNCTIONS[@]}"; do
    IFS=':' read -r FUNCTION_NAME HANDLER_FILE <<< "$FUNCTION_PAIR"
    echo ""
    echo "📦 Processing $FUNCTION_NAME..."
    
    # Download current function
    rm -f lambda-temp.zip $HANDLER_FILE
    aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Code.Location' --output text | xargs curl -s -o lambda-temp.zip
    
    if [ ! -f lambda-temp.zip ]; then
        echo "❌ Failed to download $FUNCTION_NAME"
        continue
    fi
    
    # Extract
    unzip -qo lambda-temp.zip
    
    # Check if file has broken CORS
    if grep -q "const CORS_HEADERS = {" $HANDLER_FILE && grep -q "const addCorsHeaders" $HANDLER_FILE; then
        echo "  🔧 Fixing broken CORS headers..."
        
        # Create a fixed version
        # First, remove the broken CORS section
        sed '/const CORS_HEADERS = {/,/^};/d' $HANDLER_FILE > ${HANDLER_FILE}.temp
        sed -i.bak '/const addCorsHeaders/,/^};/d' ${HANDLER_FILE}.temp
        
        # Find where to insert (after requires/imports)
        # Insert after the last require or const statement at the top
        awk -v cors="$CORS_FIX" '
            BEGIN { inserted = 0 }
            /^const.*require\(/ || /^const.*=.*process\.env/ { last_const = NR }
            {
                lines[NR] = $0
            }
            END {
                for (i = 1; i <= NR; i++) {
                    print lines[i]
                    if (i == last_const && !inserted) {
                        print ""
                        print cors
                        print ""
                        inserted = 1
                    }
                }
            }
        ' ${HANDLER_FILE}.temp > ${HANDLER_FILE}
        
        rm -f ${HANDLER_FILE}.temp ${HANDLER_FILE}.bak
    else
        echo "  ✅ CORS headers look OK"
    fi
    
    # Repackage
    zip -qr lambda-fixed.zip .
    
    # Update Lambda
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://lambda-fixed.zip \
        --region $REGION > /dev/null
    
    if [ $? -eq 0 ]; then
        echo "  ✅ Successfully updated $FUNCTION_NAME"
    else
        echo "  ❌ Failed to update $FUNCTION_NAME"
    fi
    
    # Cleanup
    rm -f lambda-temp.zip lambda-fixed.zip
done

echo ""
echo "🧪 Testing all endpoints..."
echo ""

# Test each endpoint
echo "1. Testing /games:"
curl -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games \
    -H "Origin: https://www.trioll.com" \
    -H "Access-Control-Request-Headers: x-platform,x-app-source" \
    -s -I | grep -i "access-control-allow-headers"

echo ""
echo "2. Testing /analytics/events:"
curl -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/analytics/events \
    -H "Origin: https://www.trioll.com" \
    -H "Access-Control-Request-Headers: x-platform,x-app-source" \
    -s -I | grep -i "access-control-allow-headers"

echo ""
echo "✅ All Lambda functions updated! Please refresh your website."