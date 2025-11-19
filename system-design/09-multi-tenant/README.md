# System Design: Multi-Tenant SaaS Platform

## Architecture (Silo Model with Shared Infrastructure)
```
Tenant A, B, C → API Gateway → Lambda (Tenant Context)
                                    ↓
                    ┌───────────────┼───────────────┐
                    │               │               │
                ┌───▼───┐       ┌───▼───┐      ┌───▼───┐
                │ RDS   │       │ DDB   │      │  S3   │
                │ A,B,C │       │ Pool  │      │/A/../ │
                └───────┘       │Isolated│     │/B/../ │
                                └───────┘      │/C/../ │
                                               └───────┘
```

## SDK Implementation
```typescript
// Tenant-aware DynamoDB access
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';

async function getTenantData(tenantId: string, userId: string) {
  const client = new DynamoDBClient({});

  return await client.send(
    new QueryCommand({
      TableName: 'multi-tenant-data',
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': { S: `TENANT#${tenantId}#USER#${userId}` },
      },
    })
  );
}

// Tenant isolation with IAM
async function createTenantRole(tenantId: string) {
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject'],
        Resource: `arn:aws:s3:::saas-bucket/${tenantId}/*`,
      },
      {
        Effect: 'Allow',
        Action: ['dynamodb:*'],
        Resource: '*',
        Condition: {
          'ForAllValues:StringEquals': {
            'dynamodb:LeadingKeys': [tenantId],
          },
        },
      },
    ],
  };

  // Create role with this policy
}
```

## Key Patterns
- **Pool Model**: Shared resources with isolation
- **Silo Model**: Dedicated resources per tenant
- **Cost Allocation**: Tags for per-tenant billing
- **Metering**: CloudWatch metrics per tenant
