# System Design: Real-Time Analytics

## Architecture
```
Data Sources → Kinesis → Lambda → ElastiCache → Dashboard
                  ↓
          Kinesis Analytics → S3 → Athena
```

## SDK Implementation
```typescript
import { KinesisAnalyticsV2Client, CreateApplicationCommand } from '@aws-sdk/client-kinesis-analytics-v2';

async function createAnalyticsApp() {
  const client = new KinesisAnalyticsV2Client({});

  return await client.send(
    new CreateApplicationCommand({
      ApplicationName: 'realtime-analytics',
      RuntimeEnvironment: 'FLINK-1_15',
      ServiceExecutionRole: process.env.SERVICE_ROLE_ARN!,
      ApplicationConfiguration: {
        FlinkApplicationConfiguration: {
          CheckpointConfiguration: {
            ConfigurationType: 'DEFAULT',
          },
        },
        ApplicationCodeConfiguration: {
          CodeContent: {
            S3ContentLocation: {
              BucketARN: 'arn:aws:s3:::my-code-bucket',
              FileKey: 'analytics-app.jar',
            },
          },
          CodeContentType: 'ZIPFILE',
        },
      },
    })
  );
}

// Real-time aggregation with Redis
import { ElastiCacheClient, CreateCacheClusterCommand } from '@aws-sdk/client-elasticache';

async function createRedisCluster() {
  const client = new ElastiCacheClient({});

  return await client.send(
    new CreateCacheClusterCommand({
      CacheClusterId: 'analytics-cache',
      Engine: 'redis',
      CacheNodeType: 'cache.r6g.large',
      NumCacheNodes: 3,
      PreferredAvailabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
    })
  );
}
```
