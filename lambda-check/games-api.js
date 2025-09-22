const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.REGION || 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(client);

const GAMES_TABLE = process.env.GAMES_TABLE || 'trioll-prod-games';

// Fixed CORS headers - allow all origins and custom headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Guest-Mode,X-Identity-Id,X-Platform,X-App-Source,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
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

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  // Handle OPTIONS for CORS
  if (event.httpMethod === 'OPTIONS' || event.requestContext?.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }
  
  const path = event.path || event.rawPath || '';
  const method = event.httpMethod || event.requestContext?.httpMethod || 'GET';
  const pathParameters = event.pathParameters || {};
  const queryParameters = event.queryStringParameters || {};
  
  try {
    // Route: GET /games
    if (path.includes('/games') && method === 'GET' && !pathParameters.gameId) {
      const limit = parseInt(queryParameters.limit) || 20;
      
      // Scan for games (simple approach)
      const params = {
        TableName: GAMES_TABLE,
        Limit: Math.min(limit, 50),
        FilterExpression: 'attribute_exists(#s)',
        ExpressionAttributeNames: {
          '#s': 'status'
        }
      };
      
      const result = await dynamodb.send(new ScanCommand(params));
      
      return addCorsHeaders({
        statusCode: 200,
        body: JSON.stringify({
          games: result.Items || [],
          count: result.Items?.length || 0
        })
      });
    }
    
    // Route: GET /games/{gameId}
    if (path.includes('/games/') && method === 'GET' && pathParameters.gameId) {
      const { gameId } = pathParameters;
      
      const params = {
        TableName: GAMES_TABLE,
        Key: {
          gameId: gameId,
          version: '1.0.0'
        }
      };
      
      const result = await dynamodb.send(new GetCommand(params));
      
      if (!result.Item) {
        return addCorsHeaders({
          statusCode: 404,
          body: JSON.stringify({ error: 'Game not found' })
        });
      }
      
      return addCorsHeaders({
        statusCode: 200,
        body: JSON.stringify(result.Item)
      });
    }
    
    // Default: Method not allowed
    return addCorsHeaders({
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    });
    
  } catch (error) {
    console.error('Error:', error);
    return addCorsHeaders({
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    });
  }
};