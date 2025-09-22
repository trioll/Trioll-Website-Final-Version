# Custom Authorizer Deployment Guide

## Overview
This custom authorizer allows both Cognito JWT tokens and guest tokens (`Bearer guest-{id}`) to access the analytics endpoints while maintaining security.

## Pre-Deployment Checklist

### 1. Verify Current Setup
```bash
# Check current API Gateway configuration
aws apigateway get-rest-apis --region us-east-1

# Find analytics resource
aws apigateway get-resources --rest-api-id 4ib0hvu1xj --region us-east-1 | grep analytics -A 5 -B 5

# Check current authorizers
aws apigateway get-authorizers --rest-api-id 4ib0hvu1xj --region us-east-1
```

### 2. Create IAM Role for Authorizer
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Deployment Steps

### Step 1: Prepare Authorizer Lambda
```bash
cd lambda-check

# Install dependencies
npm install --save jsonwebtoken@9.0.2 jwks-rsa@3.1.0

# Create deployment package
zip -r custom-authorizer.zip custom-authorizer.js node_modules/ package.json
```

### Step 2: Deploy Authorizer Lambda
```bash
# Create the Lambda function
aws lambda create-function \
  --function-name trioll-custom-authorizer \
  --runtime nodejs20.x \
  --handler custom-authorizer.handler \
  --role arn:aws:iam::561645284740:role/trioll-lambda-role \
  --zip-file fileb://custom-authorizer.zip \
  --timeout 10 \
  --memory-size 128 \
  --environment Variables="{COGNITO_USER_POOL_ID=us-east-1_cLPH2acQd}" \
  --region us-east-1

# Or update if it exists
aws lambda update-function-code \
  --function-name trioll-custom-authorizer \
  --zip-file fileb://custom-authorizer.zip \
  --region us-east-1
```

### Step 3: Create API Gateway Authorizer
```bash
# Create the authorizer
aws apigateway create-authorizer \
  --rest-api-id 4ib0hvu1xj \
  --name TriollCustomAuthorizer \
  --type TOKEN \
  --authorizer-uri "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:561645284740:function:trioll-custom-authorizer/invocations" \
  --identity-source "method.request.header.Authorization" \
  --authorizer-result-ttl-in-seconds 3600 \
  --region us-east-1
```

### Step 4: Grant API Gateway Permission to Invoke Authorizer
```bash
aws lambda add-permission \
  --function-name trioll-custom-authorizer \
  --statement-id apigateway-authorizer \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:561645284740:4ib0hvu1xj/*/GET/*" \
  --region us-east-1
```

### Step 5: Apply Authorizer to Analytics Endpoints
```bash
# Get the authorizer ID from step 3
AUTHORIZER_ID=<authorizer-id-from-previous-step>

# Apply to analytics endpoints (you'll need the resource IDs)
aws apigateway update-method \
  --rest-api-id 4ib0hvu1xj \
  --resource-id <analytics-resource-id> \
  --http-method POST \
  --patch-operations \
    op=replace,path=/authorizationType,value=CUSTOM \
    op=replace,path=/authorizerId,value=$AUTHORIZER_ID \
  --region us-east-1
```

### Step 6: Deploy API Changes
```bash
# Create deployment
aws apigateway create-deployment \
  --rest-api-id 4ib0hvu1xj \
  --stage-name prod \
  --description "Added custom authorizer for guest support" \
  --region us-east-1
```

## Testing

### Test Guest Token
```bash
# Test with guest token
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/analytics/events \
  -H "Authorization: Bearer guest-test123" \
  -H "Content-Type: application/json" \
  -d '{"events": [{"event": "test", "timestamp": 1234567890}]}'
```

### Test Cognito Token
```bash
# Test with real JWT token (get from browser console)
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/analytics/events \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"events": [{"event": "test", "timestamp": 1234567890}]}'
```

### Test Invalid Token
```bash
# Should return 401
curl -X POST https://4ib0hvu1xj.execute-api.us-east-1.amazonaws.com/prod/analytics/events \
  -H "Authorization: Bearer invalid" \
  -H "Content-Type: application/json" \
  -d '{"events": [{"event": "test", "timestamp": 1234567890}]}'
```

## Monitoring

### CloudWatch Logs
```bash
# View authorizer logs
aws logs tail /aws/lambda/trioll-custom-authorizer --follow

# View analytics lambda logs
aws logs tail /aws/lambda/trioll-prod-analytics-api --follow
```

### Check Authorizer Cache
- Guest tokens cached for 1 hour
- Failed auth not cached
- Monitor cache hit rate in CloudWatch

## Rollback Plan

If issues occur:
```bash
# Remove authorizer from endpoints
aws apigateway update-method \
  --rest-api-id 4ib0hvu1xj \
  --resource-id <resource-id> \
  --http-method POST \
  --patch-operations \
    op=replace,path=/authorizationType,value=AWS_IAM \
  --region us-east-1

# Redeploy
aws apigateway create-deployment \
  --rest-api-id 4ib0hvu1xj \
  --stage-name prod \
  --description "Rollback authorizer" \
  --region us-east-1
```

## Frontend Changes Required

Once deployed, re-enable analytics in `analytics.js`:
```javascript
// Remove the temporary disable
// Logger.log('Analytics: Temporarily disabled to avoid 403 errors');
// this.events = [];
// return;
```

## Security Notes

1. Guest tokens are validated for format only
2. Cognito tokens are fully validated (signature, expiry, issuer)
3. Context passed to Lambda includes `isGuest` flag
4. Authorizer caches results for 1 hour (configurable)
5. All auth failures logged for monitoring