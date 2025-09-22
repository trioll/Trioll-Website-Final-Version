const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

let sqsClient;

function getSQSClient() {
    if (!sqsClient) {
        sqsClient = new SQSClient({ 
            region: process.env.AWS_REGION || 'us-east-1'
        });
    }
    return sqsClient;
}

async function sendAnalyticsEvent(eventData) {
    const queueUrl = process.env.ANALYTICS_QUEUE_URL;
    
    if (!queueUrl) {
        console.warn('ANALYTICS_QUEUE_URL not configured');
        return;
    }
    
    try {
        const enrichedEvent = {
            ...eventData,
            timestamp: new Date().toISOString(),
            metadata: {
                ...eventData.metadata,
                functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
                region: process.env.AWS_REGION
            }
        };
        
        await getSQSClient().send(new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(enrichedEvent)
        }));
        
        console.log(`Analytics event sent: ${eventData.eventType}`);
    } catch (error) {
        console.error('Analytics error:', error.message);
    }
}

module.exports = { sendAnalyticsEvent };
