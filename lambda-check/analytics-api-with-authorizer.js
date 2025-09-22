// Analytics API Lambda Function - Works with Custom Authorizer
// Uses authorizer context to identify users (both Cognito and Guest)

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const ANALYTICS_TABLE = process.env.ANALYTICS_TABLE || 'trioll-prod-analytics';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Platform,X-App-Source',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  console.log('Analytics Event:', JSON.stringify({
    path: event.path,
    method: event.httpMethod,
    authContext: event.requestContext?.authorizer
  }, null, 2));
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  try {
    const path = event.path || '';
    const body = JSON.parse(event.body || '{}');
    
    // Get user info from authorizer context
    const userInfo = getUserInfoFromContext(event);
    console.log('User info from authorizer:', userInfo);
    
    if (!userInfo.userId) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    if (path.includes('/analytics/events')) {
      return await handleTrackEvent(userInfo, body, event);
    }
    
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Not found' })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

// Extract user info from authorizer context
function getUserInfoFromContext(event) {
  const authContext = event.requestContext?.authorizer || {};
  
  return {
    userId: authContext.userId || authContext.principalId || 'anonymous',
    isGuest: authContext.isGuest === 'true',
    authType: authContext.authType || 'unknown',
    email: authContext.email || null
  };
}

// Handle event tracking
async function handleTrackEvent(userInfo, body, event) {
  // Handle batch format
  if (body.events && Array.isArray(body.events)) {
    return await handleBatchEvents(userInfo, body, event);
  }
  
  // Single event format
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
    authType: userInfo.authType,
    eventType,
    timestamp: timestamp || new Date().toISOString(),
    data: data || {},
    metadata: {
      ip: event.requestContext?.identity?.sourceIp,
      userAgent: event.headers?.['User-Agent'] || event.headers?.['user-agent'],
      platform: event.headers?.['X-Platform'] || event.headers?.['x-platform'] || 'unknown',
      appSource: event.headers?.['X-App-Source'] || event.headers?.['x-app-source'] || 'unknown'
    }
  };
  
  try {
    await dynamodb.send(new PutCommand({
      TableName: ANALYTICS_TABLE,
      Item: analyticsEvent
    }));
    
    console.log('Event tracked:', { 
      eventId, 
      userId: userInfo.userId, 
      isGuest: userInfo.isGuest,
      eventType 
    });
    
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

// Handle batch events
async function handleBatchEvents(userInfo, body, event) {
  const events = body.events || [];
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  const platform = event.headers?.['X-Platform'] || event.headers?.['x-platform'] || 'unknown';
  const appSource = event.headers?.['X-App-Source'] || event.headers?.['x-app-source'] || 'unknown';
  
  console.log(`Processing ${events.length} events for ${userInfo.isGuest ? 'guest' : 'user'}: ${userInfo.userId}`);
  
  // Process in batches of 10 for better performance
  const batchSize = 10;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const promises = batch.map(async (evt) => {
      const eventId = `${userInfo.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const eventItem = {
        eventId,
        userId: userInfo.userId,
        isGuest: userInfo.isGuest,
        authType: userInfo.authType,
        eventType: evt.event || evt.type || evt.eventType || 'unknown',
        timestamp: evt.timestamp || new Date().toISOString(),
        data: evt,
        metadata: {
          platform,
          appSource,
          source: appSource === 'web' ? 'trioll-web' : appSource
        }
      };
      
      try {
        await dynamodb.send(new PutCommand({
          TableName: ANALYTICS_TABLE,
          Item: eventItem
        }));
        results.successful++;
      } catch (error) {
        console.error('Error saving event:', error.message);
        results.failed++;
        results.errors.push(error.message);
      }
    });
    
    await Promise.all(promises);
  }
  
  console.log(`Batch complete: ${results.successful}/${events.length} successful`);
  
  return {
    statusCode: results.successful > 0 ? 202 : 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: results.successful > 0,
      results
    })
  };
}