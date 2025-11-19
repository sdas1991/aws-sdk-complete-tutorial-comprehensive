# System Design: Multi-Region Active-Active Architecture

## Overview
Global application with active-active deployment across multiple AWS regions for high availability and low latency.

## Architecture
```
                    Route 53 (Geolocation Routing)
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  us-east-1    │     │  eu-west-1    │     │  ap-south-1   │
│               │     │               │     │               │
│  CloudFront   │────▶│  CloudFront   │────▶│  CloudFront   │
│  + WAF        │     │  + WAF        │     │  + WAF        │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐           ┌─────────┐          ┌─────────┐
   │API GW   │           │API GW   │          │API GW   │
   │+ Lambda │           │+ Lambda │          │+ Lambda │
   └────┬────┘           └────┬────┘          └────┬────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                     ┌────────┴────────┐
                     │                 │
                     ▼                 ▼
              ┌──────────┐      ┌──────────┐
              │DynamoDB  │◀────▶│DynamoDB  │
              │Global    │      │Global    │
              │Tables    │      │Tables    │
              └──────────┘      └──────────┘
```

## SDK Implementation

### Route 53 Health Checks
```typescript
import { Route53Client, CreateHealthCheckCommand } from '@aws-sdk/client-route-53';

async function createHealthCheck(endpoint: string, region: string) {
  const client = new Route53Client({ region });

  return await client.send(
    new CreateHealthCheckCommand({
      CallerReference: `${endpoint}-${Date.now()}`,
      HealthCheckConfig: {
        Type: 'HTTPS',
        ResourcePath: '/health',
        FullyQualifiedDomainName: endpoint,
        Port: 443,
        RequestInterval: 30,
        FailureThreshold: 3,
      },
    })
  );
}
```

### DynamoDB Global Tables
```typescript
import {
  DynamoDBClient,
  CreateGlobalTableCommand,
  UpdateGlobalTableCommand,
} from '@aws-sdk/client-dynamodb';

async function createGlobalTable(tableName: string, regions: string[]) {
  const client = new DynamoDBClient({ region: regions[0] });

  return await client.send(
    new CreateGlobalTableCommand({
      GlobalTableName: tableName,
      ReplicationGroup: regions.map((region) => ({ RegionName: region })),
    })
  );
}
```

### Cross-Region Replication
```typescript
import { S3Client, PutBucketReplicationCommand } from '@aws-sdk/client-s3';

async function setupCrossRegionReplication(
  sourceBucket: string,
  destBucket: string,
  destRegion: string,
  roleArn: string
) {
  const client = new S3Client({});

  return await client.send(
    new PutBucketReplicationCommand({
      Bucket: sourceBucket,
      ReplicationConfiguration: {
        Role: roleArn,
        Rules: [
          {
            Status: 'Enabled',
            Priority: 1,
            Filter: {},
            Destination: {
              Bucket: `arn:aws:s3:::${destBucket}`,
              ReplicationTime: {
                Status: 'Enabled',
                Time: { Minutes: 15 },
              },
              Metrics: {
                Status: 'Enabled',
                EventThreshold: { Minutes: 15 },
              },
            },
          },
        ],
      },
    })
  );
}
```

## Benefits
- **Low Latency**: Users routed to nearest region
- **High Availability**: Automatic failover
- **Disaster Recovery**: Data replicated across regions
- **Compliance**: Data residency requirements

## Considerations
- **Data Consistency**: Eventually consistent with Global Tables
- **Cost**: Data transfer between regions
- **Complexity**: Multi-region monitoring and deployment
