# System Design: Event-Driven Architecture

## Overview

This example demonstrates a complete event-driven architecture using AWS EventBridge, Lambda, SQS, SNS, and DynamoDB. Perfect for loosely coupled, scalable systems.

---

## Architecture Diagram

```
                         Event Producers
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────┐          ┌─────────┐           ┌─────────┐
   │   API   │          │   S3    │           │   IoT   │
   │ Gateway │          │ Events  │           │  Core   │
   └────┬────┘          └────┬────┘           └────┬────┘
        │                    │                      │
        └────────────────────┼──────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  EventBridge   │ ← Central Event Bus
                    │   Event Bus    │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │  Rule   │         │  Rule   │         │  Rule   │
   │ Order   │         │Payment  │         │Inventory│
   │ Created │         │Complete │         │ Update  │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                    │
        ├──────┬────────────┼────────┬───────────┤
        │      │            │        │           │
        ▼      ▼            ▼        ▼           ▼
    ┌────┐ ┌────┐      ┌────┐   ┌────┐     ┌────┐
    │ λ  │ │SQS │      │ λ  │   │SNS │     │ λ  │
    │ 1  │ │FIFO│      │ 2  │   │Topic│     │ 3  │
    └─┬──┘ └─┬──┘      └─┬──┘   └─┬──┘     └─┬──┘
      │      │           │        │           │
      └──────┴───────────┴────────┴───────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐    ┌─────────┐
   │DynamoDB │      │   RDS   │    │   S3    │
   │ Events  │      │Analytics│    │ Archive │
   └─────────┘      └─────────┘    └─────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  CloudWatch  │
                  │     Logs     │
                  └──────────────┘
```

---

## Implementation

### 1. EventBridge Setup

```typescript
/**
 * EventBridge Event Bus and Rules Configuration
 * SDK Version: @aws-sdk/client-eventbridge ^3.650.0
 */

import {
  EventBridgeClient,
  CreateEventBusCommand,
  PutRuleCommand,
  PutTargetsCommand,
  PutEventsCommand,
  DescribeEventBusCommand,
  ListRulesCommand,
  EnableRuleCommand,
  DisableRuleCommand,
} from '@aws-sdk/client-eventbridge';
import { createContextLogger } from '@utils/logger';

const logger = createContextLogger('EventBridge');
const client = new EventBridgeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Create custom event bus
 */
async function createEventBus(busName: string): Promise<string> {
  logger.info('Creating event bus', { busName });

  try {
    const command = new CreateEventBusCommand({
      Name: busName,
      Tags: [
        { Key: 'Environment', Value: process.env.ENVIRONMENT || 'dev' },
        { Key: 'Purpose', Value: 'event-driven-architecture' },
      ],
    });

    const response = await client.send(command);

    logger.info('Event bus created', {
      busArn: response.EventBusArn,
    });

    return response.EventBusArn!;
  } catch (error: any) {
    logger.error('Failed to create event bus', error);
    throw error;
  }
}

/**
 * Create event rule with pattern matching
 */
async function createEventRule(
  busName: string,
  ruleName: string,
  eventPattern: any,
  description?: string
): Promise<string> {
  logger.info('Creating event rule', { busName, ruleName });

  try {
    const command = new PutRuleCommand({
      Name: ruleName,
      EventBusName: busName,
      EventPattern: JSON.stringify(eventPattern),
      State: 'ENABLED',
      Description: description || `Rule for ${ruleName}`,
    });

    const response = await client.send(command);

    logger.info('Event rule created', { ruleArn: response.RuleArn });

    return response.RuleArn!;
  } catch (error: any) {
    logger.error('Failed to create event rule', error);
    throw error;
  }
}

/**
 * Add targets to event rule
 */
async function addRuleTargets(
  busName: string,
  ruleName: string,
  targets: Array<{
    id: string;
    arn: string;
    type: 'lambda' | 'sqs' | 'sns' | 'stepfunctions';
    deadLetterQueueArn?: string;
    retryPolicy?: {
      maximumRetryAttempts: number;
      maximumEventAge: number;
    };
  }>
): Promise<void> {
  logger.info('Adding targets to rule', { busName, ruleName, targetCount: targets.length });

  try {
    const command = new PutTargetsCommand({
      EventBusName: busName,
      Rule: ruleName,
      Targets: targets.map((target, index) => ({
        Id: target.id || `${index + 1}`,
        Arn: target.arn,
        DeadLetterConfig: target.deadLetterQueueArn
          ? { Arn: target.deadLetterQueueArn }
          : undefined,
        RetryPolicy: target.retryPolicy
          ? {
              MaximumRetryAttempts: target.retryPolicy.maximumRetryAttempts,
              MaximumEventAgeInSeconds: target.retryPolicy.maximumEventAge,
            }
          : {
              MaximumRetryAttempts: 2,
              MaximumEventAgeInSeconds: 3600,
            },
      })),
    });

    if (command.Targets && command.Targets.length > 0) {
      logger.info('Targets added successfully', {
        targetCount: command.Targets.length,
      });
    }
  } catch (error: any) {
    logger.error('Failed to add targets', error);
    throw error;
  }
}

/**
 * Publish event to EventBridge
 */
async function publishEvent(
  busName: string,
  source: string,
  detailType: string,
  detail: any
): Promise<void> {
  logger.info('Publishing event', { busName, source, detailType });

  try {
    const command = new PutEventsCommand({
      Entries: [
        {
          EventBusName: busName,
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
          Time: new Date(),
        },
      ],
    });

    const response = await client.send(command);

    if (response.FailedEntryCount && response.FailedEntryCount > 0) {
      logger.error('Some events failed to publish', {
        failedCount: response.FailedEntryCount,
        entries: response.Entries,
      });
      throw new Error('Failed to publish some events');
    }

    logger.info('Event published successfully');
  } catch (error: any) {
    logger.error('Failed to publish event', error);
    throw error;
  }
}

/**
 * Common Event Patterns
 */
export const EventPatterns = {
  // Order events
  orderCreated: {
    source: ['order-service'],
    'detail-type': ['OrderCreated'],
  },

  // Payment events
  paymentCompleted: {
    source: ['payment-service'],
    'detail-type': ['PaymentCompleted'],
    detail: {
      status: ['SUCCESS'],
    },
  },

  // Inventory events
  inventoryLow: {
    source: ['inventory-service'],
    'detail-type': ['InventoryUpdate'],
    detail: {
      quantity: [{ numeric: ['<', 10] }],
    },
  },

  // User events
  userRegistered: {
    source: ['user-service'],
    'detail-type': ['UserRegistered'],
  },

  // S3 events via EventBridge
  s3ObjectCreated: {
    source: ['aws.s3'],
    'detail-type': ['Object Created'],
    detail: {
      bucket: {
        name: ['my-upload-bucket'],
      },
    },
  },

  // Multiple sources
  criticalEvents: {
    source: [
      { prefix: 'critical.' },
      'payment-service',
      'security-service',
    ],
    'detail-type': [{ prefix: 'Critical' }],
  },
};

/**
 * Setup complete event-driven architecture
 */
async function setupEventDrivenArchitecture(): Promise<void> {
  const busName = 'ecommerce-events';

  try {
    // 1. Create event bus
    const busArn = await createEventBus(busName);

    // 2. Create rule for order events
    const orderRuleArn = await createEventRule(
      busName,
      'process-orders',
      EventPatterns.orderCreated,
      'Process new order events'
    );

    // 3. Add Lambda and SQS targets for order processing
    await addRuleTargets(busName, 'process-orders', [
      {
        id: 'order-processor-lambda',
        arn: process.env.ORDER_PROCESSOR_LAMBDA_ARN!,
        type: 'lambda',
        retryPolicy: {
          maximumRetryAttempts: 3,
          maximumEventAge: 7200,
        },
      },
      {
        id: 'order-queue',
        arn: process.env.ORDER_QUEUE_ARN!,
        type: 'sqs',
        deadLetterQueueArn: process.env.ORDER_DLQ_ARN,
      },
    ]);

    // 4. Create rule for payment events
    await createEventRule(
      busName,
      'process-payments',
      EventPatterns.paymentCompleted,
      'Process completed payments'
    );

    await addRuleTargets(busName, 'process-payments', [
      {
        id: 'payment-fulfillment-lambda',
        arn: process.env.FULFILLMENT_LAMBDA_ARN!,
        type: 'lambda',
      },
      {
        id: 'payment-notification-topic',
        arn: process.env.PAYMENT_SNS_TOPIC_ARN!,
        type: 'sns',
      },
    ]);

    // 5. Create rule for inventory alerts
    await createEventRule(
      busName,
      'inventory-alerts',
      EventPatterns.inventoryLow,
      'Alert when inventory is low'
    );

    await addRuleTargets(busName, 'inventory-alerts', [
      {
        id: 'inventory-alert-topic',
        arn: process.env.INVENTORY_ALERT_SNS_ARN!,
        type: 'sns',
      },
    ]);

    logger.info('Event-driven architecture setup complete', { busArn });
  } catch (error) {
    logger.error('Failed to setup event-driven architecture', error as Error);
    throw error;
  }
}

export {
  createEventBus,
  createEventRule,
  addRuleTargets,
  publishEvent,
  setupEventDrivenArchitecture,
};
```

---

### 2. Event Producers

```typescript
/**
 * Order Service - Event Producer
 */

import { publishEvent } from './eventbridge-setup';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const dynamoClient = new DynamoDBClient({});
const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'ecommerce-events';

interface Order {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: string;
}

export async function createOrder(order: Order): Promise<void> {
  // 1. Save order to DynamoDB
  await dynamoClient.send(
    new PutItemCommand({
      TableName: 'Orders',
      Item: marshall({
        PK: `ORDER#${order.orderId}`,
        SK: `ORDER#${order.orderId}`,
        ...order,
        createdAt: new Date().toISOString(),
      }),
    })
  );

  // 2. Publish OrderCreated event
  await publishEvent(EVENT_BUS_NAME, 'order-service', 'OrderCreated', {
    orderId: order.orderId,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
    timestamp: new Date().toISOString(),
  });

  console.log('Order created and event published:', order.orderId);
}
```

---

### 3. Event Consumers

```typescript
/**
 * Order Processor Lambda - Event Consumer
 */

import { EventBridgeEvent } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const sqsClient = new SQSClient({});
const dynamoClient = new DynamoDBClient({});

interface OrderCreatedDetail {
  orderId: string;
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  timestamp: string;
}

export const handler = async (
  event: EventBridgeEvent<'OrderCreated', OrderCreatedDetail>
): Promise<void> => {
  console.log('Processing order event:', JSON.stringify(event, null, 2));

  const { orderId, customerId, items, totalAmount } = event.detail;

  try {
    // 1. Update order status
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: 'Orders',
        Key: {
          PK: { S: `ORDER#${orderId}` },
          SK: { S: `ORDER#${orderId}` },
        },
        UpdateExpression: 'SET #status = :status, processedAt = :processedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: 'PROCESSING' },
          ':processedAt': { S: new Date().toISOString() },
        },
      })
    );

    // 2. Send to payment queue
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.PAYMENT_QUEUE_URL!,
        MessageBody: JSON.stringify({
          orderId,
          customerId,
          amount: totalAmount,
        }),
        MessageAttributes: {
          OrderId: {
            DataType: 'String',
            StringValue: orderId,
          },
          Priority: {
            DataType: 'String',
            StringValue: totalAmount > 1000 ? 'HIGH' : 'NORMAL',
          },
        },
      })
    );

    // 3. Check inventory for each item
    for (const item of items) {
      await checkInventory(item.productId, item.quantity);
    }

    console.log('Order processed successfully:', orderId);
  } catch (error) {
    console.error('Failed to process order:', error);
    throw error;
  }
};

async function checkInventory(productId: string, quantity: number): Promise<void> {
  // Inventory check logic
  console.log(`Checking inventory for ${productId}: ${quantity} units`);
  // If inventory low, publish InventoryUpdate event
}
```

---

### 4. Dead Letter Queue Handler

```typescript
/**
 * DLQ Processing Lambda
 * Handles failed events from DLQ
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const snsClient = new SNSClient({});
const s3Client = new S3Client({});

export const handler = async (event: SQSEvent): Promise<void> => {
  console.log('Processing DLQ messages:', event.Records.length);

  for (const record of event.Records) {
    try {
      await processDLQMessage(record);
    } catch (error) {
      console.error('Failed to process DLQ message:', error);
      // Archive to S3 for manual review
      await archiveFailedMessage(record);
    }
  }
};

async function processDLQMessage(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body);

  // 1. Log to CloudWatch
  console.error('Processing failed event:', {
    messageId: record.messageId,
    receiptHandle: record.receiptHandle,
    body: message,
    attributes: record.attributes,
  });

  // 2. Alert operations team
  await snsClient.send(
    new PublishCommand({
      TopicArn: process.env.ALERT_TOPIC_ARN!,
      Subject: 'Event Processing Failure',
      Message: JSON.stringify(
        {
          type: 'DLQ_MESSAGE',
          messageId: record.messageId,
          failureCount: record.attributes.ApproximateReceiveCount,
          message,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
    })
  );

  // 3. Attempt recovery or manual intervention
  if (shouldRetry(message)) {
    // Re-publish to event bus for retry
    await retryEvent(message);
  }
}

async function archiveFailedMessage(record: SQSRecord): Promise<void> {
  const key = `dlq-archive/${new Date().toISOString()}_${record.messageId}.json`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.ARCHIVE_BUCKET!,
      Key: key,
      Body: JSON.stringify(
        {
          record,
          archivedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      ContentType: 'application/json',
    })
  );

  console.log('Failed message archived:', key);
}

function shouldRetry(message: any): boolean {
  // Implement retry logic
  return false;
}

async function retryEvent(message: any): Promise<void> {
  // Retry logic
  console.log('Retrying event:', message);
}
```

---

## Event Patterns

### Order Processing Flow

```
1. API receives order → Publish OrderCreated event
2. OrderCreated triggers:
   - Lambda: Validate order
   - SQS: Queue for payment processing
   - Lambda: Check inventory
3. Payment complete → Publish PaymentCompleted event
4. PaymentCompleted triggers:
   - Lambda: Start fulfillment
   - SNS: Notify customer
   - DynamoDB: Update order status
5. Fulfillment complete → Publish FulfillmentCompleted event
```

---

## Benefits

1. **Loose Coupling**: Services don't know about each other
2. **Scalability**: Each component scales independently
3. **Resilience**: Built-in retry and DLQ
4. **Flexibility**: Easy to add new consumers
5. **Audit Trail**: All events logged in CloudWatch

---

## Monitoring

```typescript
/**
 * CloudWatch Metrics for Event-Driven Architecture
 */

import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cloudwatchClient = new CloudWatchClient({});

export async function publishMetrics(
  eventType: string,
  status: 'success' | 'failure',
  duration: number
): Promise<void> {
  await cloudwatchClient.send(
    new PutMetricDataCommand({
      Namespace: 'EventDrivenArchitecture',
      MetricData: [
        {
          MetricName: 'EventProcessing',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'EventType', Value: eventType },
            { Name: 'Status', Value: status },
          ],
          Timestamp: new Date(),
        },
        {
          MetricName: 'ProcessingDuration',
          Value: duration,
          Unit: 'Milliseconds',
          Dimensions: [{ Name: 'EventType', Value: eventType }],
          Timestamp: new Date(),
        },
      ],
    })
  );
}
```

---

## Cost Optimization

1. **Use SQS for buffering**: Cheaper than direct Lambda invocations
2. **Batch processing**: Process multiple events together
3. **Right-size Lambda**: Memory = CPU allocation
4. **EventBridge schemas**: Validate events early
5. **Archive to S3**: Long-term event storage

---

## Security Best Practices

1. **Encrypt event data**: Use EventBridge encryption
2. **IAM least privilege**: Specific event sources/targets
3. **VPC endpoints**: Private EventBridge access
4. **Event validation**: Schema registry
5. **Audit logging**: CloudTrail for all events

---

See [implementation](./implementation/) for complete runnable examples.
