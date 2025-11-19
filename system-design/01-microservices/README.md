# System Design: Microservices Architecture on AWS

## Overview

This example demonstrates a complete microservices architecture using AWS services, implementing best practices for scalability, reliability, and security.

---

## Architecture Diagram

```
                                    Internet
                                        │
                                        ▼
                                ┌──────────────┐
                                │   Route 53   │ DNS
                                └──────┬───────┘
                                       │
                                       ▼
                            ┌──────────────────┐
                            │   CloudFront     │ CDN
                            │   + WAF          │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                    ▼                                 ▼
        ┌───────────────────┐           ┌───────────────────┐
        │  S3 Static Site   │           │   API Gateway     │
        │  (React/Vue)      │           │   + Lambda Auth   │
        └───────────────────┘           └─────────┬─────────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                                    ▼             ▼             ▼
                              ┌─────────┐   ┌─────────┐  ┌─────────┐
                              │  ALB    │   │  ALB    │  │  ALB    │
                              └────┬────┘   └────┬────┘  └────┬────┘
                                   │             │            │
                    ┌──────────────┴──┐    ┌────┴────┐  ┌────┴────┐
                    ▼                 ▼    ▼          ▼  ▼         ▼
             ┌──────────┐      ┌──────────┐  ┌──────────┐ ┌──────────┐
             │  EKS     │      │  Lambda  │  │  Fargate │ │   EC2    │
             │ (Service │      │ (Orders) │  │ (Payment)│ │(Analytics)│
             │  Mesh)   │      └─────┬────┘  └─────┬────┘ └─────┬────┘
             └────┬─────┘            │              │            │
                  │                  └──────┬───────┴────────────┘
                  │                         │
                  └─────────────┬───────────┴──────────┐
                                │                      │
                    ┌───────────┴─────┐    ┌──────────┴────────┐
                    │                 │    │                   │
                    ▼                 ▼    ▼                   ▼
            ┌──────────────┐  ┌──────────────┐     ┌─────────────┐
            │  DynamoDB    │  │     RDS      │     │ ElastiCache │
            │  (Products)  │  │   (Orders)   │     │   (Redis)   │
            └──────────────┘  └──────────────┘     └─────────────┘
                    │                 │                   │
                    └────────┬────────┴────────┬──────────┘
                             │                 │
                             ▼                 ▼
                    ┌──────────────┐  ┌──────────────┐
                    │ EventBridge  │  │     SQS      │
                    │   (Events)   │  │   (Queue)    │
                    └──────┬───────┘  └──────┬───────┘
                           │                 │
                           └────────┬────────┘
                                    │
                           ┌────────┴────────┐
                           │                 │
                           ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐
                  │ CloudWatch   │  │   X-Ray      │
                  │  Logs/Metrics│  │  (Tracing)   │
                  └──────────────┘  └──────────────┘
```

---

## Components

### 1. Frontend Layer

#### S3 + CloudFront
- Static website hosting (React/Vue/Angular)
- Global CDN distribution
- SSL/TLS termination
- Custom domain with Route 53

**Implementation:**
```typescript
// 01-frontend-infrastructure.ts
import { S3Client, CreateBucketCommand, PutBucketWebsiteCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateDistributionCommand } from '@aws-sdk/client-cloudfront';

async function setupFrontend() {
  // Create S3 bucket for static hosting
  const bucketName = 'my-app-frontend';

  await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));

  // Enable static website hosting
  await s3Client.send(new PutBucketWebsiteCommand({
    Bucket: bucketName,
    WebsiteConfiguration: {
      IndexDocument: { Suffix: 'index.html' },
      ErrorDocument: { Key: 'error.html' }
    }
  }));

  // Create CloudFront distribution
  const distribution = await cloudFrontClient.send(new CreateDistributionCommand({
    DistributionConfig: {
      Origins: {
        Quantity: 1,
        Items: [{
          Id: 'S3-Origin',
          DomainName: `${bucketName}.s3.amazonaws.com`,
          S3OriginConfig: {
            OriginAccessIdentity: ''
          }
        }]
      },
      DefaultCacheBehavior: {
        TargetOriginId: 'S3-Origin',
        ViewerProtocolPolicy: 'redirect-to-https',
        MinTTL: 0,
        DefaultTTL: 86400,
        MaxTTL: 31536000
      },
      Enabled: true
    }
  }));
}
```

---

### 2. API Gateway Layer

#### API Gateway + Lambda Authorizer
- RESTful API endpoints
- Request validation
- JWT authentication
- Rate limiting

**Implementation:**
```typescript
// 02-api-gateway.ts
import { APIGatewayClient, CreateRestApiCommand } from '@aws-sdk/client-api-gateway';
import { LambdaClient, CreateFunctionCommand } from '@aws-sdk/client-lambda';

async function setupAPIGateway() {
  // Create API
  const api = await apiGatewayClient.send(new CreateRestApiCommand({
    name: 'Microservices-API',
    description: 'Main API for microservices',
    endpointConfiguration: {
      types: ['REGIONAL']
    }
  }));

  // Create Lambda authorizer
  const authFunction = await lambdaClient.send(new CreateFunctionCommand({
    FunctionName: 'api-authorizer',
    Runtime: 'nodejs18.x',
    Role: authorizerRoleArn,
    Handler: 'index.handler',
    Code: {
      ZipFile: Buffer.from(authorizerCode)
    }
  }));

  // Attach authorizer to API
  // ... API Gateway configuration
}
```

---

### 3. Service Layer

#### A. User Service (EKS)
- Kubernetes deployment
- Service mesh (App Mesh or Istio)
- Auto-scaling

```yaml
# user-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: microservices
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      serviceAccountName: user-service-sa
      containers:
      - name: user-service
        image: account.dkr.ecr.region.amazonaws.com/user-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: host
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
```

#### B. Order Service (Lambda)
- Event-driven processing
- Auto-scaling
- Pay-per-use

```typescript
// order-service/index.ts
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

export const handler = async (event: any) => {
  const order = JSON.parse(event.body);

  // Validate order
  if (!order.customerId || !order.items) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid order' })
    };
  }

  try {
    // Save to DynamoDB
    await dynamoDBClient.send(new PutItemCommand({
      TableName: 'Orders',
      Item: {
        orderId: { S: order.orderId },
        customerId: { S: order.customerId },
        items: { S: JSON.stringify(order.items) },
        status: { S: 'PENDING' },
        createdAt: { S: new Date().toISOString() }
      }
    }));

    // Send to payment queue
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.PAYMENT_QUEUE_URL,
      MessageBody: JSON.stringify(order)
    }));

    // Emit event
    await eventBridgeClient.send(new PutEventsCommand({
      Entries: [{
        Source: 'order-service',
        DetailType: 'OrderCreated',
        Detail: JSON.stringify(order),
        EventBusName: 'microservices-events'
      }]
    }));

    return {
      statusCode: 201,
      body: JSON.stringify({ orderId: order.orderId })
    };
  } catch (error) {
    console.error('Error processing order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
```

#### C. Payment Service (Fargate)
- Container-based
- Isolated execution
- Secrets management

```typescript
// payment-service/app.ts
import express from 'express';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const app = express();
const sqsClient = new SQSClient({});
const secretsClient = new SecretsManagerClient({});

// Process payments from queue
async function processPayments() {
  const queueUrl = process.env.PAYMENT_QUEUE_URL!;

  while (true) {
    const messages = await sqsClient.send(new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20
    }));

    for (const message of messages.Messages || []) {
      try {
        const order = JSON.parse(message.Body!);

        // Get payment gateway credentials from Secrets Manager
        const secret = await secretsClient.send(new GetSecretValueCommand({
          SecretId: 'payment-gateway-credentials'
        }));

        const credentials = JSON.parse(secret.SecretString!);

        // Process payment
        const paymentResult = await processPayment(order, credentials);

        // Delete message from queue
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle!
        }));

        console.log('Payment processed:', paymentResult);
      } catch (error) {
        console.error('Payment processing error:', error);
      }
    }
  }
}

processPayments();
app.listen(8080);
```

---

### 4. Data Layer

#### DynamoDB (Products, Sessions)
```typescript
// Single table design for products
const productTable = {
  TableName: 'Products',
  KeySchema: [
    { AttributeName: 'PK', KeyType: 'HASH' },  // Partition key
    { AttributeName: 'SK', KeyType: 'RANGE' }   // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'PK', AttributeType: 'S' },
    { AttributeName: 'SK', AttributeType: 'S' },
    { AttributeName: 'GSI1PK', AttributeType: 'S' },
    { AttributeName: 'GSI1SK', AttributeType: 'S' }
  ],
  GlobalSecondaryIndexes: [{
    IndexName: 'GSI1',
    KeySchema: [
      { AttributeName: 'GSI1PK', KeyType: 'HASH' },
      { AttributeName: 'GSI1SK', KeyType: 'RANGE' }
    ],
    Projection: { ProjectionType: 'ALL' }
  }],
  BillingMode: 'PAY_PER_REQUEST'
};
```

#### RDS (Orders, Transactions)
```typescript
import { RDSClient, CreateDBInstanceCommand } from '@aws-sdk/client-rds';

// Create RDS instance for transactional data
const dbInstance = await rdsClient.send(new CreateDBInstanceCommand({
  DBInstanceIdentifier: 'orders-db',
  DBInstanceClass: 'db.t3.medium',
  Engine: 'postgres',
  EngineVersion: '14.7',
  MasterUsername: 'admin',
  MasterUserPassword: 'secure-password',
  AllocatedStorage: 100,
  StorageEncrypted: true,
  MultiAZ: true,
  BackupRetentionPeriod: 7,
  VpcSecurityGroupIds: [securityGroupId]
}));
```

---

### 5. Event & Messaging Layer

#### EventBridge
```typescript
import { EventBridgeClient, PutRuleCommand, PutTargetsCommand } from '@aws-sdk/client-eventbridge';

// Create event rule
await eventBridgeClient.send(new PutRuleCommand({
  Name: 'order-created-rule',
  EventPattern: JSON.stringify({
    source: ['order-service'],
    'detail-type': ['OrderCreated']
  }),
  State: 'ENABLED'
}));

// Add Lambda target
await eventBridgeClient.send(new PutTargetsCommand({
  Rule: 'order-created-rule',
  Targets: [{
    Id: '1',
    Arn: inventoryLambdaArn
  }]
}));
```

---

### 6. Monitoring & Observability

#### CloudWatch + X-Ray
```typescript
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { XRayClient } from '@aws-sdk/client-xray';
import AWSXRay from 'aws-xray-sdk-core';

// Instrument AWS SDK
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

// Custom metrics
await cloudWatchClient.send(new PutMetricDataCommand({
  Namespace: 'Microservices',
  MetricData: [{
    MetricName: 'OrdersProcessed',
    Value: 1,
    Unit: 'Count',
    Dimensions: [{
      Name: 'ServiceName',
      Value: 'order-service'
    }]
  }]
}));
```

---

## Deployment Strategy

### Blue/Green Deployment
```typescript
// Using CodeDeploy for blue/green deployments
import { CodeDeployClient, CreateDeploymentCommand } from '@aws-sdk/client-codedeploy';

await codeDeployClient.send(new CreateDeploymentCommand({
  applicationName: 'microservices-app',
  deploymentGroupName: 'production',
  deploymentConfigName: 'CodeDeployDefault.AllAtOnce',
  revision: {
    revisionType: 'S3',
    s3Location: {
      bucket: 'deployment-artifacts',
      key: 'app-v2.0.0.zip',
      bundleType: 'zip'
    }
  }
}));
```

---

## Cost Optimization

1. **Use Savings Plans** for predictable workloads
2. **Auto-scaling** for variable traffic
3. **Spot Instances** for non-critical services
4. **Reserved Capacity** for DynamoDB
5. **CloudFront caching** to reduce origin requests

---

## Security Best Practices

1. **VPC isolation** for backend services
2. **IAM roles** for service-to-service communication
3. **Secrets Manager** for credentials
4. **WAF** for API protection
5. **Encryption at rest and in transit**
6. **CloudTrail** for audit logging

---

## Complete Implementation

See [implementation](./implementation/) directory for full code examples.
