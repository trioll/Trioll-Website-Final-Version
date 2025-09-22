# Analytics Guest Support Fix Plan

## Problem
The analytics endpoint is returning 403 Forbidden for guest users because:
1. API Gateway might be requiring Cognito authentication
2. The Lambda function doesn't properly handle `Bearer guest-{id}` tokens

## Solution Overview
Enable guest analytics by accepting `Bearer guest-{id}` tokens without Cognito validation.

## Changes Made in analytics-api-guest-fix.js

### 1. Enhanced User Detection
```javascript
// Now properly checks Authorization header for guest tokens
if (authHeader.startsWith('Bearer guest-')) {
    const guestId = authHeader.replace('Bearer guest-', '');
    return {
        userId: guestId,
        isGuest: true,
        source: 'guest-token'
    };
}
```

### 2. Added User Tracking
- Tracks `isGuest` flag on all events
- Records `userSource` (guest-token, cognito, header, anonymous)
- Maintains guest session continuity

### 3. Improved Logging
- Logs user detection for debugging
- Tracks batch processing success/failure
- Shows platform source (web, mobile, etc)

## API Gateway Configuration Needed

### Option 1: Remove Authorization Requirement (Recommended)
In API Gateway console:
1. Go to the analytics endpoints
2. Remove Authorization requirement
3. Let Lambda handle auth internally

### Option 2: Add Custom Authorizer
Create a Lambda authorizer that:
- Accepts `Bearer guest-*` tokens
- Passes through to Lambda without Cognito check
- Still validates real JWT tokens

## Deployment Steps

1. **Test Locally First**
   ```bash
   cd lambda-check
   npm install
   # Test with sample events
   ```

2. **Deploy Updated Lambda**
   ```bash
   zip -r analytics-api.zip analytics-api-guest-fix.js node_modules/
   aws lambda update-function-code \
     --function-name trioll-prod-analytics-api \
     --zip-file fileb://analytics-api.zip \
     --region us-east-1
   ```

3. **Update API Gateway**
   - Remove auth requirement from `/analytics/*` routes
   - OR add custom authorizer for guest tokens

4. **Re-enable Frontend Analytics**
   - Remove the temporary disable in analytics.js
   - Test with guest users

## Security Considerations

1. **Rate Limiting**: Guest requests should be rate limited
2. **Data Retention**: Consider shorter TTL for guest data (90 days)
3. **Validation**: Still validate event structure
4. **Monitoring**: Track guest vs authenticated ratio

## Testing Plan

1. Deploy to test environment first
2. Send test guest analytics events
3. Verify DynamoDB writes
4. Check CloudWatch logs
5. Monitor for errors
6. Gradual rollout to production