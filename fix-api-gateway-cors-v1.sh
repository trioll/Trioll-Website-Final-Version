#!/bin/bash

# Script to update API Gateway (REST API v1) CORS configuration
# This updates CORS at the API Gateway level for all resources

echo "🔧 Updating API Gateway REST API CORS Configuration"
echo "=================================================="

# API Gateway configuration
API_ID="4ib0hvu1xj"
REGION="us-east-1"
STAGE="prod"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 API Gateway: trioll-prod-api (${API_ID})${NC}"
echo ""

# Function to enable CORS on a resource
enable_cors_for_resource() {
    local resource_id=$1
    local resource_path=$2
    
    echo -e "  ${YELLOW}Updating CORS for: ${resource_path}${NC}"
    
    # Check if OPTIONS method exists
    OPTIONS_EXISTS=$(aws apigateway get-method \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method OPTIONS \
        --region $REGION 2>/dev/null)
    
    if [ -z "$OPTIONS_EXISTS" ]; then
        # Create OPTIONS method if it doesn't exist
        echo "    Creating OPTIONS method..."
        aws apigateway put-method \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method OPTIONS \
            --authorization-type NONE \
            --region $REGION > /dev/null 2>&1
        
        # Add mock integration for OPTIONS
        aws apigateway put-integration \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method OPTIONS \
            --type MOCK \
            --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
            --region $REGION > /dev/null 2>&1
        
        # Add integration response
        aws apigateway put-integration-response \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{
                "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source'\''",
                "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,PUT,DELETE,OPTIONS'\''",
                "method.response.header.Access-Control-Allow-Origin": "'\''*'\''"
            }' \
            --response-templates '{"application/json": ""}' \
            --region $REGION > /dev/null 2>&1
        
        # Add method response
        aws apigateway put-method-response \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method OPTIONS \
            --status-code 200 \
            --response-parameters '{
                "method.response.header.Access-Control-Allow-Headers": true,
                "method.response.header.Access-Control-Allow-Methods": true,
                "method.response.header.Access-Control-Allow-Origin": true
            }' \
            --response-models '{"application/json": "Empty"}' \
            --region $REGION > /dev/null 2>&1
    fi
    
    # Update CORS headers for all other methods
    for METHOD in GET POST PUT DELETE; do
        METHOD_EXISTS=$(aws apigateway get-method \
            --rest-api-id $API_ID \
            --resource-id $resource_id \
            --http-method $METHOD \
            --region $REGION 2>/dev/null)
        
        if [ -n "$METHOD_EXISTS" ]; then
            echo "    Updating $METHOD method..."
            
            # Update method response to include CORS headers
            aws apigateway update-method-response \
                --rest-api-id $API_ID \
                --resource-id $resource_id \
                --http-method $METHOD \
                --status-code 200 \
                --patch-operations \
                    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value=true \
                    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Headers,value=true \
                    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Methods,value=true \
                --region $REGION > /dev/null 2>&1
            
            # Update integration response to return CORS headers
            aws apigateway update-integration-response \
                --rest-api-id $API_ID \
                --resource-id $resource_id \
                --http-method $METHOD \
                --status-code 200 \
                --patch-operations \
                    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Origin,value="'*'" \
                    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Headers,value="'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source'" \
                    op=add,path=/responseParameters/method.response.header.Access-Control-Allow-Methods,value="'GET,POST,PUT,DELETE,OPTIONS'" \
                --region $REGION > /dev/null 2>&1
        fi
    done
    
    echo -e "    ${GREEN}✓ CORS updated for ${resource_path}${NC}"
}

# Get all resources
echo "📊 Getting all API resources..."
RESOURCES=$(aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query 'items[?resourceMethods != `null`].[id,path]' \
    --output text)

echo -e "\n${YELLOW}🔄 Updating CORS for all resources...${NC}"

# Process each resource
while IFS=$'\t' read -r resource_id resource_path; do
    if [ -n "$resource_id" ]; then
        enable_cors_for_resource "$resource_id" "$resource_path"
    fi
done <<< "$RESOURCES"

# Deploy the changes
echo -e "\n${YELLOW}🚀 Deploying API changes...${NC}"

DEPLOYMENT_DESC="CORS update to allow custom headers including X-Platform and X-App-Source"

aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name $STAGE \
    --description "$DEPLOYMENT_DESC" \
    --region $REGION > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ API changes deployed successfully!${NC}"
else
    echo -e "${RED}❌ Failed to deploy API changes${NC}"
    exit 1
fi

echo -e "\n${GREEN}🎉 API Gateway CORS update complete!${NC}"
echo ""
echo "CORS headers updated to allow:"
echo "✓ Origins: * (all origins)"
echo "✓ Methods: GET, POST, PUT, DELETE, OPTIONS"
echo "✓ Headers: Content-Type, Authorization, X-Guest-Mode, X-Identity-Id, X-Platform, X-App-Source"
echo ""
echo "Please refresh your website - it should work now!"