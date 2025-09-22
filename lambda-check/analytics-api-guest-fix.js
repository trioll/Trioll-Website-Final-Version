// Analytics API Lambda Function with Guest Support
// Tracks user events and game interactions for both authenticated and guest users

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'trioll-prod-analytics';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Identity-Id,X-Platform,X-App-Source,X-Guest-Mode,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Analytics Event:', JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    auth: event.requestContext?.authorizer
  }, null, 2));
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  const response = {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
  
  try {
    const path = event.path || event.rawPath || '';
    const body = JSON.parse(event.body || '{}');
    
    // Enhanced user ID extraction that handles guest tokens
    const userInfo = getUserInfoFromEvent(event);
    console.log('User info extracted:', userInfo);
    
    if (path.includes('/analytics/events')) {
      return handleTrackEvent(userInfo, body, event);
    } else if (path.includes('/analytics/identify')) {
      return handleIdentify(userInfo, body);
    } else if (path.includes('/analytics/games')) {
      return handleGameAnalytics(userInfo, body);
    }
    
    response.statusCode = 404;
    response.body = JSON.stringify({ error: 'Not found' });
    
  } catch (error) {
    console.error('Error:', error);
    response.statusCode = 500;
    response.body = JSON.stringify({ error: 'Internal server error' });
  }
  
  return response;
};

function getUserInfoFromEvent(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization || '';
  
  // Check for guest token in Authorization header
  if (authHeader.startsWith('Bearer guest-')) {
    const guestId = authHeader.replace('Bearer guest-', '');
    console.log('Guest user detected:', guestId);
    return {
      userId: guestId,
      isGuest: true,
      source: 'guest-token'
    };
  }
  
  // Check for authenticated user from Cognito authorizer
  const claims = event.requestContext?.authorizer?.jwt?.claims || 
                 event.requestContext?.authorizer?.claims || {};
  
  if (claims.sub) {
    return {
      userId: claims.sub,
      isGuest: false,
      source: 'cognito',
      email: claims.email
    };
  }
  
  // Check for custom headers (fallback)
  const identityId = event.headers?.['X-Identity-Id'] || event.headers?.['x-identity-id'];
  const guestMode = event.headers?.['X-Guest-Mode'] || event.headers?.['x-guest-mode'];
  
  if (identityId) {
    return {
      userId: identityId,
      isGuest: guestMode === 'true',
      source: 'header'
    };
  }
  
  // Check for Cognito Identity ID (Amplify guest users)
  if (event.requestContext?.identity?.cognitoIdentityId) {
    return {
      userId: event.requestContext.identity.cognitoIdentityId,
      isGuest: true,
      source: 'cognito-identity'
    };
  }
  
  // Generate anonymous ID from IP as last resort
  const sourceIp = event.requestContext?.identity?.sourceIp || 
                   event.requestContext?.http?.sourceIp || 
                   'anonymous';
  
  return {
    userId: `anon-${sourceIp.replace(/\./g, '-')}-${Date.now()}`,
    isGuest: true,
    source: 'anonymous'
  };
}

async function handleTrackEvent(userInfo, body, event) {
  // Handle batch format from frontend
  if (body.events && Array.isArray(body.events)) {
    return handleBatchEvents(userInfo, body, event);
  }
  
  // Handle single event format
  const { eventType, data, timestamp } = body;
  
  if (!eventType) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'eventType is required' })
    };
  }
  
  const eventId = `${userInfo.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const analyticsEvent = {
    eventId,
    userId: userInfo.userId,
    isGuest: userInfo.isGuest,
    userSource: userInfo.source,
    eventType,
    timestamp: timestamp || new Date().toISOString(),
    data: data || {},
    ip: event.requestContext?.identity?.sourceIp,
    userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent'],
    platform: event.headers?.['X-Platform'] || event.headers?.['x-platform'] || 'unknown',
    appSource: event.headers?.['X-App-Source'] || event.headers?.['x-app-source'] || 'unknown'
  };
  
  try {
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: analyticsEvent
    }));
    
    console.log('Event tracked:', { eventId, userId: userInfo.userId, eventType });
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, eventId })
    };
  } catch (error) {
    console.error('Error saving event:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to save event' })
    };
  }
}

async function handleBatchEvents(userInfo, body, event) {
  const events = body.events;
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  // Get platform info from headers
  const platform = event.headers?.['X-Platform'] || event.headers?.['x-platform'] || 'unknown';
  const appSource = event.headers?.['X-App-Source'] || event.headers?.['x-app-source'] || 'unknown';
  
  console.log(`Processing batch of ${events.length} events for user ${userInfo.userId} (guest: ${userInfo.isGuest})`);
  
  // Process each event
  for (const evt of events) {
    try {
      const eventId = `${userInfo.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const eventItem = {
        eventId,
        userId: userInfo.userId,
        isGuest: userInfo.isGuest,
        userSource: userInfo.source,
        eventType: evt.type || evt.event || evt.eventType,
        timestamp: evt.timestamp || new Date().toISOString(),
        data: {
          ...evt,
          platform,
          appSource
        }
      };
      
      // For web platform analytics
      if (platform === 'pc' || appSource === 'web') {
        eventItem.data.source = 'trioll-web';
        console.log('Web event tracked:', eventItem.eventType);
      }
      
      await dynamodb.send(new PutCommand({
        TableName: ANALYTICS_TABLE,
        Item: eventItem
      }));
      
      results.successful++;
    } catch (error) {
      console.error('Error saving event:', error);
      results.failed++;
      results.errors.push(error.message);
    }
  }
  
  console.log(`Batch complete: ${results.successful} successful, ${results.failed} failed`);
  
  // Return 202 Accepted for batch processing
  return {
    statusCode: 202,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: results.successful > 0,
      results
    })
  };
}

async function handleIdentify(userInfo, body) {
  const { traits, timestamp } = body;
  
  const identifyEvent = {
    eventId: `identify-${userInfo.userId}-${Date.now()}`,
    userId: userInfo.userId,
    isGuest: userInfo.isGuest,
    userSource: userInfo.source,
    eventType: 'identify',
    timestamp: timestamp || new Date().toISOString(),
    data: traits || {}
  };
  
  try {
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: identifyEvent
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error saving identify event:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to save identify event' })
    };
  }
}

async function handleGameAnalytics(userInfo, body) {
  const { gameId, action, data, timestamp } = body;
  
  if (!gameId || !action) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'gameId and action are required' })
    };
  }
  
  const gameEvent = {
    eventId: `game-${gameId}-${userInfo.userId}-${Date.now()}`,
    userId: userInfo.userId,
    isGuest: userInfo.isGuest,
    userSource: userInfo.source,
    eventType: 'game_interaction',
    timestamp: timestamp || new Date().toISOString(),
    data: {
      gameId,
      action,
      ...data
    }
  };
  
  try {
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: gameEvent
    }));
    
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error saving game event:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to save game event' })
    };
  }
}