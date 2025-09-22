// Custom Lambda Authorizer for Trioll Analytics
// Handles both Cognito JWT tokens and Guest tokens (Bearer guest-{id})

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Configuration
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_cLPH2acQd';
const COGNITO_REGION = process.env.AWS_REGION || 'us-east-1';
const COGNITO_ISS = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`;

// JWKS client for Cognito token validation
const client = jwksClient({
    jwksUri: `${COGNITO_ISS}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000 // 10 minutes
});

// Get signing key from Cognito
function getSigningKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
        } else {
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
        }
    });
}

// Main handler
exports.handler = async (event) => {
    console.log('Authorizer event:', JSON.stringify({
        type: event.type,
        methodArn: event.methodArn,
        authorizationToken: event.authorizationToken ? 'present' : 'missing'
    }));

    try {
        const token = event.authorizationToken;
        
        if (!token) {
            console.log('No authorization token provided');
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        // Handle guest tokens
        if (token.startsWith('Bearer guest-')) {
            const guestId = token.replace('Bearer guest-', '').trim();
            
            if (!guestId || guestId.length < 5) {
                console.log('Invalid guest token format');
                return generatePolicy('user', 'Deny', event.methodArn);
            }

            console.log('Guest token authorized:', guestId);
            
            // Allow guest with context
            return generatePolicy(guestId, 'Allow', event.methodArn, {
                userId: guestId,
                isGuest: 'true',
                authType: 'guest'
            });
        }

        // Handle Cognito JWT tokens
        if (token.startsWith('Bearer ')) {
            const jwtToken = token.replace('Bearer ', '').trim();
            
            try {
                // Decode and verify the JWT token
                const decoded = await verifyToken(jwtToken);
                console.log('Cognito token verified for user:', decoded.sub);
                
                // Allow authenticated user with context
                return generatePolicy(decoded.sub, 'Allow', event.methodArn, {
                    userId: decoded.sub,
                    email: decoded.email || '',
                    isGuest: 'false',
                    authType: 'cognito'
                });
                
            } catch (error) {
                console.error('JWT verification failed:', error.message);
                return generatePolicy('user', 'Deny', event.methodArn);
            }
        }

        // Unknown token format
        console.log('Unknown token format');
        return generatePolicy('user', 'Deny', event.methodArn);

    } catch (error) {
        console.error('Authorizer error:', error);
        // In case of error, deny access
        return generatePolicy('user', 'Deny', event.methodArn);
    }
};

// Verify Cognito JWT token
function verifyToken(token) {
    return new Promise((resolve, reject) => {
        // First decode to get the header
        const decoded = jwt.decode(token, { complete: true });
        
        if (!decoded || !decoded.header || !decoded.header.kid) {
            return reject(new Error('Invalid token structure'));
        }

        // Get the signing key from Cognito
        getSigningKey(decoded.header, (err, key) => {
            if (err) {
                return reject(err);
            }

            // Verify the token
            jwt.verify(token, key, {
                issuer: COGNITO_ISS,
                algorithms: ['RS256']
            }, (err, payload) => {
                if (err) {
                    return reject(err);
                }
                
                // Additional validation
                if (!payload.sub) {
                    return reject(new Error('Token missing sub claim'));
                }

                // Check token expiration
                const currentTime = Math.floor(Date.now() / 1000);
                if (payload.exp && payload.exp < currentTime) {
                    return reject(new Error('Token expired'));
                }

                resolve(payload);
            });
        });
    });
}

// Generate IAM policy
function generatePolicy(principalId, effect, resource, context = {}) {
    const authResponse = {
        principalId: principalId
    };

    if (effect && resource) {
        authResponse.policyDocument = {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource
            }]
        };
    }

    // Add context that will be available in the Lambda function
    authResponse.context = {
        ...context,
        principalId: principalId,
        timestamp: new Date().toISOString()
    };

    // Enable caching (1 hour for Allow, 0 for Deny)
    if (effect === 'Allow') {
        authResponse.usageIdentifierKey = principalId;
    }

    console.log('Generated policy:', JSON.stringify(authResponse));
    return authResponse;
}

// Helper function to extract API Gateway ARN parts
function extractArnParts(arn) {
    // arn:aws:execute-api:region:account-id:api-id/stage/method/resource-path
    const arnParts = arn.split(':');
    const apiGatewayParts = arnParts[5].split('/');
    
    return {
        region: arnParts[3],
        accountId: arnParts[4],
        apiId: apiGatewayParts[0],
        stage: apiGatewayParts[1],
        method: apiGatewayParts[2],
        resource: apiGatewayParts.slice(3).join('/')
    };
}