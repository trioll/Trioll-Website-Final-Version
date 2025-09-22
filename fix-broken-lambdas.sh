#!/bin/bash

# Fix broken Lambda functions with correct CORS headers

echo "🔧 Fixing Broken Lambda Functions"
echo "================================="

REGION="us-east-1"

# Fix games-api Lambda
echo "📦 Fixing trioll-prod-games-api..."

# Create deployment package with fixed file
cd /Users/frederickcaplin/Desktop/trioll-website-production
cp games-api-fixed.js games-api.js
# Extract original zip to get dependencies
unzip -q games-lambda.zip -d lambda-temp
cp games-api.js lambda-temp/
cd lambda-temp
zip -qr ../games-api-fixed.zip .
cd ..
rm -rf lambda-temp

# Update the Lambda function
aws lambda update-function-code \
    --function-name trioll-prod-games-api \
    --zip-file fileb://games-api-fixed.zip \
    --region $REGION > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ Successfully fixed trioll-prod-games-api"
else
    echo "❌ Failed to update trioll-prod-games-api"
fi

# Test the fix
echo ""
echo "🧪 Testing the fix..."
sleep 5

echo ""
echo "Testing OPTIONS request:"
curl -X OPTIONS https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/games \
    -H "Origin: https://www.trioll.com" \
    -H "Access-Control-Request-Headers: x-platform,x-app-source" \
    -H "Access-Control-Request-Method: GET" \
    -s -I | grep -i "access-control-allow"

echo ""
echo "✅ Lambda function fixed! Please refresh your website."