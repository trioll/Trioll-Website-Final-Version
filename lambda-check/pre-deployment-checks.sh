#!/bin/bash

# Pre-deployment safety checks for custom authorizer
# Run this before deploying to ensure we don't break existing functionality

echo "=== Trioll Analytics Authorizer Pre-Deployment Checks ==="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Gateway ID
API_ID="4ib0hvu1xj"
REGION="us-east-1"

echo "1. Checking current API Gateway configuration..."
echo "================================================"

# Get current authorizers
echo -e "${YELLOW}Current authorizers:${NC}"
aws apigateway get-authorizers --rest-api-id $API_ID --region $REGION --query 'items[*].[name,type,authType]' --output table

echo
echo "2. Checking analytics endpoints..."
echo "==================================="

# Find analytics resources
echo -e "${YELLOW}Analytics resources:${NC}"
aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?pathPart==`analytics`]' --output json > analytics-resources.json

if [ -s analytics-resources.json ]; then
    echo -e "${GREEN}Found analytics resources${NC}"
    cat analytics-resources.json | jq -r '.[] | "Resource ID: \(.id), Path: \(.path)"'
else
    echo -e "${RED}WARNING: No analytics resources found!${NC}"
fi

echo
echo "3. Checking current Lambda functions..."
echo "======================================="

# Check if custom authorizer already exists
if aws lambda get-function --function-name trioll-custom-authorizer --region $REGION 2>/dev/null; then
    echo -e "${YELLOW}WARNING: trioll-custom-authorizer already exists!${NC}"
    echo "You may want to update instead of create"
else
    echo -e "${GREEN}Custom authorizer Lambda does not exist yet${NC}"
fi

# Check analytics Lambda
echo
echo -e "${YELLOW}Analytics Lambda status:${NC}"
aws lambda get-function-configuration --function-name trioll-prod-analytics-api --region $REGION --query '[FunctionName,Runtime,LastModified,CodeSize]' --output table

echo
echo "4. Testing current authentication..."
echo "===================================="

# Test current endpoint (should fail with guest token)
echo -e "${YELLOW}Testing with guest token (expected to fail):${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/analytics/events \
  -H "Authorization: Bearer guest-test123" \
  -H "Content-Type: application/json" \
  -d '{"events": [{"event": "test"}]}' 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}Current behavior confirmed: Guest tokens are rejected (403)${NC}"
else
    echo -e "${RED}Unexpected response code: $HTTP_CODE${NC}"
fi

echo
echo "5. Dependency check..."
echo "======================"

# Check if dependencies are installed
if [ -f "package.json" ]; then
    echo -e "${YELLOW}Checking for required dependencies:${NC}"
    if grep -q "jsonwebtoken" package.json && grep -q "jwks-rsa" package.json; then
        echo -e "${GREEN}Dependencies found in package.json${NC}"
    else
        echo -e "${RED}Missing dependencies! Run: npm install jsonwebtoken@9.0.2 jwks-rsa@3.1.0${NC}"
    fi
else
    echo -e "${RED}No package.json found!${NC}"
fi

echo
echo "6. IAM Role check..."
echo "===================="

# Check if Lambda role exists
ROLE_NAME="trioll-lambda-role"
if aws iam get-role --role-name $ROLE_NAME --region $REGION 2>/dev/null; then
    echo -e "${GREEN}IAM role $ROLE_NAME exists${NC}"
    
    # Check if role has basic Lambda permissions
    POLICIES=$(aws iam list-attached-role-policies --role-name $ROLE_NAME --region $REGION --query 'AttachedPolicies[*].PolicyName' --output text)
    echo "Attached policies: $POLICIES"
else
    echo -e "${RED}IAM role $ROLE_NAME not found!${NC}"
fi

echo
echo "7. Current production traffic check..."
echo "======================================"

# Get CloudWatch metrics for current traffic
echo -e "${YELLOW}Recent API calls (last hour):${NC}"
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=trioll-prod-api \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region $REGION \
  --query 'Datapoints[0].Sum' \
  --output text

echo
echo "=== Pre-deployment Check Summary ==="
echo "===================================="
echo
echo "Before deploying:"
echo "1. ✓ Backup current Lambda functions"
echo "2. ✓ Test in a development environment first"
echo "3. ✓ Have rollback commands ready"
echo "4. ✓ Monitor CloudWatch logs during deployment"
echo "5. ✓ Test both guest and authenticated tokens after deployment"
echo
echo -e "${YELLOW}Recommended deployment order:${NC}"
echo "1. Deploy custom authorizer Lambda"
echo "2. Create authorizer in API Gateway"
echo "3. Test authorizer with test event"
echo "4. Apply to ONE analytics endpoint first"
echo "5. Test thoroughly"
echo "6. Apply to remaining endpoints"
echo "7. Deploy API Gateway changes"
echo "8. Update analytics Lambda to use authorizer context"
echo "9. Re-enable frontend analytics"

# Cleanup
rm -f analytics-resources.json

echo
echo "=== Check complete ==="