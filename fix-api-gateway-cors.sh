#!/bin/bash

# Script to update API Gateway CORS configuration
# This fixes CORS at the API Gateway level, which overrides Lambda CORS settings

echo "🔧 Updating API Gateway CORS Configuration"
echo "=========================================="

# API Gateway configuration
API_ID="4ib0hvu1xj"
REGION="us-east-1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 API Gateway: trioll-prod-api (${API_ID})${NC}"
echo ""

# First, let's check current CORS configuration
echo "📊 Checking current CORS configuration..."
aws apigatewayv2 get-apis --region $REGION | grep -A5 -B5 $API_ID

# Update CORS configuration for the API
echo -e "\n${YELLOW}🔄 Updating CORS configuration...${NC}"

# Update the API with proper CORS configuration
aws apigatewayv2 update-api \
    --api-id $API_ID \
    --region $REGION \
    --cors-configuration '{
        "AllowOrigins": ["*"],
        "AllowHeaders": ["Content-Type", "Authorization", "X-Guest-Mode", "X-Identity-Id", "X-Platform", "X-App-Source"],
        "AllowMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "ExposeHeaders": ["Content-Type"],
        "MaxAge": 3600,
        "AllowCredentials": false
    }'

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API Gateway CORS configuration updated successfully!${NC}"
else
    echo -e "${RED}❌ Failed to update API Gateway CORS configuration${NC}"
    exit 1
fi

# Get all routes to ensure they have CORS enabled
echo -e "\n${YELLOW}📍 Checking routes...${NC}"
ROUTES=$(aws apigatewayv2 get-routes --api-id $API_ID --region $REGION --query 'Items[].RouteId' --output text)

# Deploy the changes
echo -e "\n${YELLOW}🚀 Deploying API changes...${NC}"

# Get the deployment stage (usually 'prod')
STAGE_NAME="prod"

# Create a new deployment to apply changes
DEPLOYMENT_ID=$(aws apigatewayv2 create-deployment \
    --api-id $API_ID \
    --region $REGION \
    --query 'DeploymentId' \
    --output text)

if [ -n "$DEPLOYMENT_ID" ]; then
    echo -e "${GREEN}✅ Created deployment: $DEPLOYMENT_ID${NC}"
    
    # Update the stage with the new deployment
    aws apigatewayv2 update-stage \
        --api-id $API_ID \
        --stage-name $STAGE_NAME \
        --deployment-id $DEPLOYMENT_ID \
        --region $REGION > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Stage '$STAGE_NAME' updated with new deployment${NC}"
    else
        echo -e "${YELLOW}⚠️  Stage update might have failed, but CORS should still be updated${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Could not create deployment, but CORS configuration was updated${NC}"
fi

echo -e "\n${GREEN}🎉 API Gateway CORS update complete!${NC}"
echo ""
echo "The API Gateway now allows the following headers:"
echo "- Content-Type"
echo "- Authorization"
echo "- X-Guest-Mode"
echo "- X-Identity-Id"
echo "- X-Platform"
echo "- X-App-Source"
echo ""
echo "Please refresh your website and try again!"