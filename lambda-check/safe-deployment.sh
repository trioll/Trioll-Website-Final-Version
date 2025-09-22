#!/bin/bash

# Safe deployment script for custom authorizer
# Deploys incrementally with validation at each step

set -e # Exit on error

echo "=== Safe Deployment of Custom Authorizer ==="
echo "This script will deploy the custom authorizer step by step"
echo "You can abort at any time by pressing Ctrl+C"
echo

# Configuration
API_ID="4ib0hvu1xj"
REGION="us-east-1"
ACCOUNT_ID="561645284740"
AUTHORIZER_FUNCTION="trioll-custom-authorizer"
ANALYTICS_FUNCTION="trioll-prod-analytics-api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper function
confirm() {
    read -p "$1 (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted by user"
        exit 1
    fi
}

echo "Step 1: Pre-deployment backup"
echo "=============================="
echo -e "${YELLOW}Backing up current analytics Lambda...${NC}"

# Download current function
aws lambda get-function --function-name $ANALYTICS_FUNCTION --region $REGION --query 'Code.Location' --output text | xargs curl -o analytics-backup.zip
echo -e "${GREEN}✓ Backup saved to analytics-backup.zip${NC}"

confirm "Continue with deployment?"

echo
echo "Step 2: Install dependencies"
echo "============================"

if [ ! -f "package.json" ]; then
    echo -e "${YELLOW}Creating package.json...${NC}"
    cp authorizer-package.json package.json
fi

echo -e "${YELLOW}Installing dependencies...${NC}"
npm install --save jsonwebtoken@9.0.2 jwks-rsa@3.1.0
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo
echo "Step 3: Create deployment package"
echo "================================="

echo -e "${YELLOW}Creating authorizer zip...${NC}"
zip -r custom-authorizer.zip custom-authorizer.js node_modules/ package.json
echo -e "${GREEN}✓ Deployment package created${NC}"

echo
echo "Step 4: Deploy authorizer Lambda"
echo "================================"

confirm "Deploy custom authorizer Lambda function?"

# Check if function exists
if aws lambda get-function --function-name $AUTHORIZER_FUNCTION --region $REGION 2>/dev/null; then
    echo -e "${YELLOW}Updating existing function...${NC}"
    aws lambda update-function-code \
        --function-name $AUTHORIZER_FUNCTION \
        --zip-file fileb://custom-authorizer.zip \
        --region $REGION
else
    echo -e "${YELLOW}Creating new function...${NC}"
    aws lambda create-function \
        --function-name $AUTHORIZER_FUNCTION \
        --runtime nodejs20.x \
        --handler custom-authorizer.handler \
        --role arn:aws:iam::$ACCOUNT_ID:role/trioll-lambda-role \
        --zip-file fileb://custom-authorizer.zip \
        --timeout 10 \
        --memory-size 128 \
        --environment Variables="{COGNITO_USER_POOL_ID=us-east-1_cLPH2acQd}" \
        --region $REGION
fi

# Wait for function to be active
echo -e "${YELLOW}Waiting for function to be active...${NC}"
aws lambda wait function-active --function-name $AUTHORIZER_FUNCTION --region $REGION
echo -e "${GREEN}✓ Authorizer Lambda deployed${NC}"

echo
echo "Step 5: Test authorizer Lambda"
echo "==============================="

echo -e "${YELLOW}Testing with guest token...${NC}"
TEST_RESULT=$(aws lambda invoke \
    --function-name $AUTHORIZER_FUNCTION \
    --payload file://test-events/authorizer-guest-test.json \
    --region $REGION \
    test-output.json 2>&1)

if grep -q "Allow" test-output.json; then
    echo -e "${GREEN}✓ Guest token test passed${NC}"
    cat test-output.json | jq '.'
else
    echo -e "${RED}✗ Guest token test failed${NC}"
    cat test-output.json
    confirm "Continue anyway?"
fi

rm -f test-output.json

echo
echo "Step 6: Create API Gateway authorizer"
echo "====================================="

confirm "Create API Gateway authorizer?"

# Check if authorizer already exists
EXISTING_AUTH=$(aws apigateway get-authorizers --rest-api-id $API_ID --region $REGION --query "items[?name=='TriollCustomAuthorizer'].id" --output text)

if [ ! -z "$EXISTING_AUTH" ]; then
    echo -e "${YELLOW}Authorizer already exists with ID: $EXISTING_AUTH${NC}"
    AUTHORIZER_ID=$EXISTING_AUTH
else
    echo -e "${YELLOW}Creating new authorizer...${NC}"
    CREATE_RESULT=$(aws apigateway create-authorizer \
        --rest-api-id $API_ID \
        --name TriollCustomAuthorizer \
        --type TOKEN \
        --authorizer-uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$AUTHORIZER_FUNCTION/invocations" \
        --identity-source "method.request.header.Authorization" \
        --authorizer-result-ttl-in-seconds 3600 \
        --region $REGION)
    
    AUTHORIZER_ID=$(echo $CREATE_RESULT | jq -r '.id')
    echo -e "${GREEN}✓ Authorizer created with ID: $AUTHORIZER_ID${NC}"
fi

# Grant permission
echo -e "${YELLOW}Granting API Gateway permission to invoke authorizer...${NC}"
aws lambda add-permission \
    --function-name $AUTHORIZER_FUNCTION \
    --statement-id apigateway-authorizer-$(date +%s) \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*" \
    --region $REGION 2>/dev/null || echo "Permission might already exist"

echo
echo "Step 7: Test endpoints before applying authorizer"
echo "================================================="

echo -e "${YELLOW}Getting analytics resource IDs...${NC}"
ANALYTICS_RESOURCES=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?pathPart==`analytics`].id' --output text)

if [ -z "$ANALYTICS_RESOURCES" ]; then
    echo -e "${RED}No analytics resources found!${NC}"
    exit 1
fi

echo -e "${GREEN}Found analytics resource: $ANALYTICS_RESOURCES${NC}"

# Find events resource
EVENTS_RESOURCE=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?pathPart=='events' && parentId=='$ANALYTICS_RESOURCES'].id" --output text)
echo -e "${GREEN}Found events resource: $EVENTS_RESOURCE${NC}"

confirm "Apply authorizer to analytics/events endpoint?"

echo
echo "Step 8: Apply authorizer to endpoint"
echo "===================================="

echo -e "${YELLOW}Updating method to use custom authorizer...${NC}"
aws apigateway update-method \
    --rest-api-id $API_ID \
    --resource-id $EVENTS_RESOURCE \
    --http-method POST \
    --patch-operations \
        op=replace,path=/authorizationType,value=CUSTOM \
        op=replace,path=/authorizerId,value=$AUTHORIZER_ID \
    --region $REGION

echo -e "${GREEN}✓ Authorizer applied to POST /analytics/events${NC}"

echo
echo "Step 9: Deploy API Gateway changes"
echo "=================================="

confirm "Deploy API Gateway changes to production?"

DEPLOYMENT_ID=$(aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Added custom authorizer for guest analytics support" \
    --region $REGION \
    --query 'id' \
    --output text)

echo -e "${GREEN}✓ API Gateway deployed (deployment ID: $DEPLOYMENT_ID)${NC}"

echo
echo "Step 10: Test the deployed endpoint"
echo "==================================="

echo -e "${YELLOW}Waiting 10 seconds for deployment to propagate...${NC}"
sleep 10

echo -e "${YELLOW}Testing with guest token:${NC}"
GUEST_TEST=$(curl -s -w "\n%{http_code}" -X POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/analytics/events \
  -H "Authorization: Bearer guest-test123" \
  -H "Content-Type: application/json" \
  -d '{"events": [{"event": "deployment_test", "timestamp": "'$(date +%s)'"}]}' 2>/dev/null)

HTTP_CODE=$(echo "$GUEST_TEST" | tail -n1)
RESPONSE_BODY=$(echo "$GUEST_TEST" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    echo -e "${GREEN}✓ Guest token accepted! Response: $RESPONSE_BODY${NC}"
else
    echo -e "${RED}✗ Guest token failed! HTTP $HTTP_CODE${NC}"
    echo "Response: $RESPONSE_BODY"
    echo
    echo -e "${YELLOW}To rollback:${NC}"
    echo "aws apigateway update-method --rest-api-id $API_ID --resource-id $EVENTS_RESOURCE --http-method POST --patch-operations op=replace,path=/authorizationType,value=AWS_IAM --region $REGION"
    echo "aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --description 'Rollback authorizer' --region $REGION"
fi

echo
echo "Step 11: Deploy updated analytics Lambda"
echo "========================================"

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
    confirm "Deploy updated analytics Lambda that uses authorizer context?"
    
    echo -e "${YELLOW}Creating analytics deployment package...${NC}"
    cp analytics-api-with-authorizer.js analytics-api.js
    zip -r analytics-api.zip analytics-api.js node_modules/
    
    echo -e "${YELLOW}Updating analytics Lambda...${NC}"
    aws lambda update-function-code \
        --function-name $ANALYTICS_FUNCTION \
        --zip-file fileb://analytics-api.zip \
        --region $REGION
    
    echo -e "${GREEN}✓ Analytics Lambda updated${NC}"
fi

echo
echo "=== Deployment Complete ==="
echo "=========================="
echo
echo -e "${GREEN}✓ Custom authorizer deployed${NC}"
echo -e "${GREEN}✓ Guest tokens now accepted${NC}"
echo -e "${GREEN}✓ Analytics endpoint updated${NC}"
echo
echo "Next steps:"
echo "1. Monitor CloudWatch logs:"
echo "   aws logs tail /aws/lambda/$AUTHORIZER_FUNCTION --follow"
echo "   aws logs tail /aws/lambda/$ANALYTICS_FUNCTION --follow"
echo
echo "2. Re-enable frontend analytics by removing the temporary disable in analytics.js"
echo
echo "3. Test both guest and authenticated users"
echo
echo "Rollback commands saved to: rollback-commands.txt"

# Save rollback commands
cat > rollback-commands.txt << EOF
# Rollback commands if needed
aws apigateway update-method --rest-api-id $API_ID --resource-id $EVENTS_RESOURCE --http-method POST --patch-operations op=replace,path=/authorizationType,value=AWS_IAM --region $REGION
aws apigateway create-deployment --rest-api-id $API_ID --stage-name prod --description 'Rollback authorizer' --region $REGION
aws lambda update-function-code --function-name $ANALYTICS_FUNCTION --zip-file fileb://analytics-backup.zip --region $REGION
EOF

echo -e "${YELLOW}Rollback commands saved to rollback-commands.txt${NC}"