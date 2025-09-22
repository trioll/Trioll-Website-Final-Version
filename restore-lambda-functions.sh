#!/bin/bash

# Restore Lambda functions from backup before our fixes broke them

echo "🔄 Restoring Lambda Functions from Backup"
echo "========================================"

REGION="us-east-1"

# Get the last known good deployment (before today)
echo "Finding last known good deployments..."

# For each critical Lambda function, restore from before our changes
FUNCTIONS=(
    "trioll-prod-games-api"
    "trioll-prod-analytics-api"
    "trioll-prod-users-api"
    "trioll-prod-interactions-api"
)

for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
    echo ""
    echo "🔧 Restoring $FUNCTION_NAME..."
    
    # Get function update history
    LAST_GOOD_VERSION=$(aws lambda list-versions-by-function \
        --function-name $FUNCTION_NAME \
        --region $REGION \
        --query "Versions[?LastModified<'2025-09-22T16:00:00.000+0000'].Version" \
        --output text | tail -1)
    
    if [ -n "$LAST_GOOD_VERSION" ] && [ "$LAST_GOOD_VERSION" != "$LATEST" ]; then
        echo "  Found version $LAST_GOOD_VERSION from before our changes"
        
        # Get the code from the good version
        GOOD_CODE_URL=$(aws lambda get-function \
            --function-name "${FUNCTION_NAME}:${LAST_GOOD_VERSION}" \
            --region $REGION \
            --query 'Code.Location' \
            --output text)
        
        if [ -n "$GOOD_CODE_URL" ]; then
            # Download and deploy the good version
            curl -s "$GOOD_CODE_URL" -o good-function.zip
            
            aws lambda update-function-code \
                --function-name $FUNCTION_NAME \
                --zip-file fileb://good-function.zip \
                --region $REGION > /dev/null
            
            if [ $? -eq 0 ]; then
                echo "  ✅ Restored $FUNCTION_NAME to working version"
            else
                echo "  ❌ Failed to restore $FUNCTION_NAME"
            fi
            
            rm -f good-function.zip
        fi
    else
        echo "  ⚠️  No previous version found, will need manual fix"
    fi
done

echo ""
echo "🧪 Testing restored functions..."
sleep 5

# Test endpoints
echo ""
echo "Testing /games endpoint:"
RESPONSE=$(curl -s -w "\n%{http_code}" https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games?limit=1)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Games endpoint restored!"
else
    echo "❌ Games endpoint still broken (HTTP $HTTP_CODE)"
fi

echo ""
echo "⚠️  IMPORTANT: Lambda functions restored but CORS headers reverted"
echo "You'll need to update API Gateway to allow custom headers"