// Analytics API Lambda Function
// Tracks user events and game interactions

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
  console.log('Event:', JSON.stringify(event, null, 2));
  
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
    
    // Extract user ID from auth token or use guest ID
    const userId = getUserIdFromEvent(event);
    
    if (path.includes('/analytics/events')) {
      return handleTrackEvent(userId, body);
    } else if (path.includes('/analytics/identify')) {
      return handleIdentify(userId, body);
    } else if (path.includes('/analytics/games')) {
      return handleGameAnalytics(userId, body);
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

function getUserIdFromEvent(event) {
  // Try to get user ID from Cognito auth
  const claims = event.requestContext?.authorizer?.jwt?.claims || 
                 event.requestContext?.authorizer?.claims || {};
  
  if (claims.sub) {
    return claims.sub;
  }
  
  // Check for Cognito Identity ID (Amplify guest users)
  if (event.requestContext?.identity?.cognitoIdentityId) {
    return event.requestContext.identity.cognitoIdentityId;
  }
  
  // Check for custom header
  if (event.headers?.['X-Identity-Id'] || event.headers?.['x-identity-id']) {
    return event.headers['X-Identity-Id'] || event.headers['x-identity-id'];
  }
  
  // Generate guest ID from IP or use a default
  const sourceIp = event.requestContext?.identity?.sourceIp || 
                   event.requestContext?.http?.sourceIp || 
                   'guest';
  
  return `guest-${sourceIp.replace(/\./g, '-')}`;
}

async function handleTrackEvent(userId, body) {
  // Handle batch format from frontend
  if (body.events && Array.isArray(body.events)) {
    return handleBatchEvents(userId, body);
  }
  
  // Handle single event format (backward compatibility)
  const { eventType, data, timestamp } = body;
  
  if (!eventType) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'eventType is required' })
    };
  }
  
  const eventId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const event = {
    eventId,
    userId,
    eventType,
    timestamp: timestamp || new Date().toISOString(),
    data: data || {},
    ip: event.requestContext?.identity?.sourceIp,
    userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent']
  };
  
  try {
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: event
    }));
    
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

async function handleBatchEvents(userId, body) {
  const events = body.events;
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  // Get platform info from headers
  const platform = body.headers?.['X-Platform'] || body.headers?.['x-platform'] || 'unknown';
  const appSource = body.headers?.['X-App-Source'] || body.headers?.['x-app-source'] || 'unknown';
  
  // Process each event
  for (const event of events) {
    try {
      const eventId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const eventItem = {
        eventId,
        userId,
        eventType: event.type || event.event || event.eventType,
        timestamp: event.timestamp || new Date().toISOString(),
        data: {
          ...event,
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

async function handleIdentify(userId, body) {
  const { traits, timestamp } = body;
  
  const identifyEvent = {
    eventId: `identify-${userId}-${Date.now()}`,
    userId,
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

async function handleGameAnalytics(userId, body) {
  const { gameId, action, data, timestamp } = body;
  
  if (!gameId || !action) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'gameId and action are required' })
    };
  }
  
  const gameEvent = {
    eventId: `game-${gameId}-${userId}-${Date.now()}`,
    userId,
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