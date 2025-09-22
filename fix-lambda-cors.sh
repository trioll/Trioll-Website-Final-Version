#!/bin/bash

# Script to update CORS configuration in all Trioll Lambda functions
# This fixes the issue where custom headers (X-Platform, X-App-Source) are blocked

echo "🔧 Updating Lambda CORS Configuration for Trioll Platform"
echo "=================================================="

# List of Lambda functions to update
LAMBDA_FUNCTIONS=(
    "trioll-prod-games-api"
    "trioll-prod-users-api"
    "trioll-prod-interactions-api"
    "trioll-prod-analytics-api"
    "trioll-prod-analytics-processor"
    "trioll-prod-search-games"
)

# CORS headers configuration
CORS_HEADERS='{
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Content-Type": "application/json"
}'

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AWS Region
REGION="us-east-1"

echo -e "${YELLOW}📋 Lambda functions to update:${NC}"
for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo "   - $func"
done
echo ""

# Function to create the CORS response handler
create_cors_handler() {
    cat << 'EOF'
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json'
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
};

// Handle OPTIONS requests
if (event.httpMethod === 'OPTIONS') {
    return addCorsHeaders({
        statusCode: 200,
        body: JSON.stringify({ message: 'OK' })
    });
}
EOF
}

# Update each Lambda function
for FUNCTION_NAME in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Processing: $FUNCTION_NAME${NC}"
    
    # Create a temporary directory for the function code
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download current function code
    echo "  📥 Downloading function code..."
    aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" --query 'Code.Location' --output text | xargs curl -s -o function.zip
    
    if [ ! -f function.zip ]; then
        echo -e "  ${RED}❌ Failed to download function code${NC}"
        cd - > /dev/null
        rm -rf "$TEMP_DIR"
        continue
    fi
    
    # Extract the zip file
    unzip -q function.zip
    
    # Find the main handler file (usually index.js or [function-name].js)
    HANDLER_FILE=""
    if [ -f "index.js" ]; then
        HANDLER_FILE="index.js"
    elif [ -f "${FUNCTION_NAME#trioll-prod-}.js" ]; then
        HANDLER_FILE="${FUNCTION_NAME#trioll-prod-}.js"
    elif [ -f "lambda.js" ]; then
        HANDLER_FILE="lambda.js"
    else
        # Find first .js file
        HANDLER_FILE=$(find . -name "*.js" -type f | head -n 1)
    fi
    
    if [ -z "$HANDLER_FILE" ]; then
        echo -e "  ${RED}❌ Could not find handler file${NC}"
        cd - > /dev/null
        rm -rf "$TEMP_DIR"
        continue
    fi
    
    echo "  📝 Updating $HANDLER_FILE with CORS headers..."
    
    # Backup original file
    cp "$HANDLER_FILE" "${HANDLER_FILE}.backup"
    
    # Check if CORS headers already exist
    if grep -q "CORS_HEADERS" "$HANDLER_FILE"; then
        echo "  ⚠️  CORS headers already defined, updating..."
        # Update existing CORS headers
        sed -i.tmp "/'Access-Control-Allow-Headers':/s/: '[^']*'/: 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source'/" "$HANDLER_FILE"
    else
        echo "  ✨ Adding CORS headers to handler..."
        # Add CORS headers at the beginning of the file after any requires
        awk '
        BEGIN { headers_added = 0 }
        /^const.*require\(/ || /^import/ { print; next }
        !headers_added && !/^const.*require\(/ && !/^import/ {
            print "// CORS Headers Configuration"
            print "const CORS_HEADERS = {"
            print "    '\''Access-Control-Allow-Origin'\'': '\''*'\'',"
            print "    '\''Access-Control-Allow-Headers'\'': '\''Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source'\'',"
            print "    '\''Access-Control-Allow-Methods'\'': '\''GET,POST,PUT,DELETE,OPTIONS'\'',"
            print "    '\''Content-Type'\'': '\''application/json'\''"
            print "};"
            print ""
            headers_added = 1
        }
        { print }
        ' "$HANDLER_FILE" > "${HANDLER_FILE}.new" && mv "${HANDLER_FILE}.new" "$HANDLER_FILE"
    fi
    
    # Ensure all responses include CORS headers
    # This is a simplified approach - in production, you'd want more sophisticated parsing
    if ! grep -q "addCorsHeaders" "$HANDLER_FILE"; then
        # Add helper function if not present
        sed -i.tmp '/const CORS_HEADERS/a\
\
// Helper function to add CORS headers to response\
const addCorsHeaders = (response) => {\
    return {\
        ...response,\
        headers: {\
            ...response.headers,\
            ...CORS_HEADERS\
        }\
    };\
};\
' "$HANDLER_FILE"
    fi
    
    # Handle OPTIONS requests if not already handled
    if ! grep -q "httpMethod === 'OPTIONS'" "$HANDLER_FILE"; then
        # Add OPTIONS handling at the beginning of the handler
        sed -i.tmp '/exports\.handler.*async.*event/,/^[[:space:]]*{/ {
            /^[[:space:]]*{/a\
    // Handle OPTIONS requests for CORS\
    if (event.httpMethod === '\''OPTIONS'\'') {\
        return {\
            statusCode: 200,\
            headers: CORS_HEADERS,\
            body: JSON.stringify({ message: '\''OK'\'' })\
        };\
    }\

        }' "$HANDLER_FILE"
    fi
    
    # Create new zip file
    echo "  📦 Creating updated deployment package..."
    zip -q -r function-updated.zip .
    
    # Update the Lambda function
    echo "  🚀 Deploying updated function..."
    if aws lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file fileb://function-updated.zip \
        --region "$REGION" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ Successfully updated $FUNCTION_NAME${NC}"
    else
        echo -e "  ${RED}❌ Failed to update $FUNCTION_NAME${NC}"
    fi
    
    # Cleanup
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    echo ""
done

echo -e "${GREEN}🎉 CORS update complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the API endpoints to ensure CORS is working"
echo "2. Re-enable the custom headers in the frontend code"
echo "3. Deploy the frontend changes"