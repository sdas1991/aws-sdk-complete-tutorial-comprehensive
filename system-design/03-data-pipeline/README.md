# System Design: Data Pipeline Architecture

## Overview

Complete ETL/ELT data pipeline using S3, Lambda, Glue, Athena, and Kinesis for real-time and batch processing.

---

## Architecture Diagram

```
Data Sources
     │
     ├──────┬──────────┬──────────┬────────┐
     │      │          │          │        │
     ▼      ▼          ▼          ▼        ▼
  ┌────┐ ┌────┐    ┌────┐    ┌────┐   ┌────┐
  │App │ │Logs│    │IoT │    │DB  │   │3rd │
  │API │ │    │    │Data│    │CDC │   │Party│
  └──┬─┘ └──┬─┘    └──┬─┘    └──┬─┘   └──┬─┘
     │      │         │         │        │
     └──────┴─────────┴─────────┴────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Kinesis Data    │
            │     Streams      │
            └─────────┬────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   ┌────────┐   ┌────────┐   ┌────────┐
   │Kinesis │   │Kinesis │   │Lambda  │
   │Firehose│   │Analytics│  │Real-time│
   └────┬───┘   └────┬───┘   └────┬───┘
        │            │            │
        │            └────┬───────┘
        │                 │
        ▼                 ▼
   ┌─────────────────────────────┐
   │      S3 Data Lake           │
   │                              │
   │  ├─ raw/                    │
   │  │  └─ year/month/day/      │
   │  │                          │
   │  ├─ processed/              │
   │  │  └─ parquet files        │
   │  │                          │
   │  └─ curated/                │
   │     └─ analytics ready      │
   └──────────┬──────────────────┘
              │
       ┌──────┴──────┐
       │             │
       ▼             ▼
  ┌─────────┐  ┌─────────┐
  │  Glue   │  │ Lambda  │
  │  ETL    │  │Transform│
  │  Jobs   │  │         │
  └────┬────┘  └────┬────┘
       │            │
       └──────┬─────┘
              │
              ▼
       ┌──────────────┐
       │ Glue Catalog │
       │  (Metadata)  │
       └──────┬───────┘
              │
       ┌──────┴──────┬──────────┐
       │             │          │
       ▼             ▼          ▼
  ┌─────────┐  ┌─────────┐ ┌─────────┐
  │ Athena  │  │Redshift │ │QuickSight│
  │ Query   │  │Spectrum │ │Dashboard │
  └─────────┘  └─────────┘ └─────────┘
```

---

## Implementation

### 1. Kinesis Data Streams Setup

```typescript
/**
 * Kinesis Streams for Real-Time Data Ingestion
 * SDK Version: @aws-sdk/client-kinesis ^3.650.0
 */

import {
  KinesisClient,
  CreateStreamCommand,
  DescribeStreamCommand,
  PutRecordCommand,
  PutRecordsCommand,
  GetRecordsCommand,
  GetShardIteratorCommand,
  PutRecordsRequestEntry,
} from '@aws-sdk/client-kinesis';
import { createContextLogger } from '@utils/logger';

const logger = createContextLogger('Kinesis');
const client = new KinesisClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 5,
  retryMode: 'adaptive',
});

/**
 * Create Kinesis stream
 */
async function createDataStream(
  streamName: string,
  shardCount: number = 1
): Promise<string> {
  logger.info('Creating Kinesis stream', { streamName, shardCount });

  try {
    const command = new CreateStreamCommand({
      StreamName: streamName,
      ShardCount: shardCount,
      StreamModeDetails: {
        StreamMode: 'PROVISIONED', // or 'ON_DEMAND'
      },
    });

    await client.send(command);

    // Wait for stream to be active
    await waitForStreamActive(streamName);

    logger.info('Kinesis stream created', { streamName });
    return streamName;
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      logger.warn('Stream already exists', { streamName });
      return streamName;
    }
    logger.error('Failed to create stream', error);
    throw error;
  }
}

/**
 * Wait for stream to become active
 */
async function waitForStreamActive(
  streamName: string,
  maxAttempts: number = 30
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const command = new DescribeStreamCommand({ StreamName: streamName });
    const response = await client.send(command);

    if (response.StreamDescription?.StreamStatus === 'ACTIVE') {
      return;
    }

    logger.info('Waiting for stream to be active', {
      streamName,
      status: response.StreamDescription?.StreamStatus,
      attempt: i + 1,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Stream ${streamName} did not become active in time`);
}

/**
 * Put single record to stream
 */
async function putRecord(
  streamName: string,
  data: any,
  partitionKey: string
): Promise<void> {
  try {
    const command = new PutRecordCommand({
      StreamName: streamName,
      Data: Buffer.from(JSON.stringify(data)),
      PartitionKey: partitionKey,
    });

    const response = await client.send(command);

    logger.debug('Record put to stream', {
      streamName,
      shardId: response.ShardId,
      sequenceNumber: response.SequenceNumber,
    });
  } catch (error: any) {
    logger.error('Failed to put record', error);
    throw error;
  }
}

/**
 * Put multiple records to stream (batch)
 */
async function putRecordsBatch(
  streamName: string,
  records: Array<{ data: any; partitionKey: string }>
): Promise<void> {
  logger.info('Putting records batch', {
    streamName,
    recordCount: records.length,
  });

  try {
    const entries: PutRecordsRequestEntry[] = records.map((record) => ({
      Data: Buffer.from(JSON.stringify(record.data)),
      PartitionKey: record.partitionKey,
    }));

    const command = new PutRecordsCommand({
      StreamName: streamName,
      Records: entries,
    });

    const response = await client.send(command);

    if (response.FailedRecordCount && response.FailedRecordCount > 0) {
      logger.error('Some records failed', {
        failedCount: response.FailedRecordCount,
        records: response.Records?.filter((r) => r.ErrorCode),
      });

      // Retry failed records
      const failedRecords = response.Records?.filter((r) => r.ErrorCode).map(
        (r, idx) => records[idx]
      );

      if (failedRecords && failedRecords.length > 0) {
        await putRecordsBatch(streamName, failedRecords);
      }
    }

    logger.info('Records batch put successfully', {
      successCount: records.length - (response.FailedRecordCount || 0),
    });
  } catch (error: any) {
    logger.error('Failed to put records batch', error);
    throw error;
  }
}

export { createDataStream, putRecord, putRecordsBatch };
```

---

### 2. Lambda Data Transformer

```typescript
/**
 * Lambda function to transform raw data
 * Triggered by S3 events or Kinesis
 */

import { S3Event, S3EventRecord } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { GlueClient, StartCrawlerCommand } from '@aws-sdk/client-glue';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);
const gzip = promisify(zlib.gzip);

const s3Client = new S3Client({});
const glueClient = new GlueClient({});

interface RawEvent {
  timestamp: string;
  userId: string;
  eventType: string;
  properties: Record<string, any>;
}

interface TransformedEvent {
  event_timestamp: string;
  user_id: string;
  event_type: string;
  properties: string;
  year: string;
  month: string;
  day: string;
  hour: string;
}

export const handler = async (event: S3Event): Promise<void> => {
  console.log('Processing S3 events:', event.Records.length);

  for (const record of event.Records) {
    await processRecord(record);
  }

  // Trigger Glue crawler to update catalog
  await triggerGlueCrawler();
};

async function processRecord(record: S3EventRecord): Promise<void> {
  const bucket = record.s3.bucket.name;
  const key = record.s3.object.key;

  console.log('Processing file:', { bucket, key });

  try {
    // 1. Get object from S3
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await s3Client.send(getCommand);

    if (!response.Body) {
      throw new Error('Empty response body');
    }

    // 2. Read and decompress data
    const bodyBuffer = await streamToBuffer(response.Body);
    const decompressed = key.endsWith('.gz')
      ? await gunzip(bodyBuffer)
      : bodyBuffer;

    // 3. Parse JSON lines
    const lines = decompressed.toString('utf-8').split('\n').filter(Boolean);
    const rawEvents: RawEvent[] = lines.map((line) => JSON.parse(line));

    // 4. Transform events
    const transformedEvents = rawEvents.map(transformEvent);

    // 5. Group by date for partitioning
    const grouped = groupByDate(transformedEvents);

    // 6. Write partitioned data
    await writePartitionedData(bucket, grouped);

    console.log('File processed successfully', {
      bucket,
      key,
      recordCount: rawEvents.length,
    });
  } catch (error) {
    console.error('Failed to process record', error);
    throw error;
  }
}

function transformEvent(raw: RawEvent): TransformedEvent {
  const timestamp = new Date(raw.timestamp);

  return {
    event_timestamp: timestamp.toISOString(),
    user_id: raw.userId,
    event_type: raw.eventType,
    properties: JSON.stringify(raw.properties),
    year: timestamp.getUTCFullYear().toString(),
    month: (timestamp.getUTCMonth() + 1).toString().padStart(2, '0'),
    day: timestamp.getUTCDate().toString().padStart(2, '0'),
    hour: timestamp.getUTCHours().toString().padStart(2, '0'),
  };
}

function groupByDate(
  events: TransformedEvent[]
): Map<string, TransformedEvent[]> {
  const grouped = new Map<string, TransformedEvent[]>();

  for (const event of events) {
    const partition = `year=${event.year}/month=${event.month}/day=${event.day}/hour=${event.hour}`;

    if (!grouped.has(partition)) {
      grouped.set(partition, []);
    }

    grouped.get(partition)!.push(event);
  }

  return grouped;
}

async function writePartitionedData(
  bucket: string,
  grouped: Map<string, TransformedEvent[]>
): Promise<void> {
  const processedPrefix = 'processed/events';

  for (const [partition, events] of grouped.entries()) {
    // Convert to newline-delimited JSON
    const ndjson = events.map((e) => JSON.stringify(e)).join('\n');

    // Compress
    const compressed = await gzip(Buffer.from(ndjson, 'utf-8'));

    // Upload to S3
    const key = `${processedPrefix}/${partition}/data_${Date.now()}.json.gz`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: compressed,
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
        Metadata: {
          recordCount: events.length.toString(),
          partition,
        },
      })
    );

    console.log('Written partition:', { key, recordCount: events.length });
  }
}

async function triggerGlueCrawler(): Promise<void> {
  const crawlerName = process.env.GLUE_CRAWLER_NAME;

  if (!crawlerName) {
    return;
  }

  try {
    await glueClient.send(
      new StartCrawlerCommand({
        Name: crawlerName,
      })
    );

    console.log('Glue crawler triggered:', crawlerName);
  } catch (error: any) {
    if (error.name === 'CrawlerRunningException') {
      console.log('Crawler already running');
    } else {
      console.error('Failed to trigger crawler', error);
    }
  }
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
```

---

### 3. Glue ETL Job

```typescript
/**
 * AWS Glue ETL Job (PySpark)
 * Converts JSON to Parquet with schema optimization
 */

// This would be a Python script for Glue, but showing the setup via SDK

import {
  GlueClient,
  CreateJobCommand,
  StartJobRunCommand,
  GetJobRunCommand,
} from '@aws-sdk/client-glue';

const glueClient = new GlueClient({});

async function createGlueETLJob(
  jobName: string,
  scriptLocation: string,
  roleArn: string
): Promise<void> {
  const command = new CreateJobCommand({
    Name: jobName,
    Role: roleArn,
    Command: {
      Name: 'glueetl',
      ScriptLocation: scriptLocation,
      PythonVersion: '3',
    },
    DefaultArguments: {
      '--job-language': 'python',
      '--job-bookmark-option': 'job-bookmark-enable',
      '--enable-metrics': 'true',
      '--enable-continuous-cloudwatch-log': 'true',
      '--TempDir': 's3://my-bucket/glue-temp/',
    },
    MaxRetries: 1,
    Timeout: 2880, // 48 hours
    GlueVersion: '4.0',
    NumberOfWorkers: 10,
    WorkerType: 'G.1X', // 1 DPU
  });

  await glueClient.send(command);
  console.log('Glue ETL job created:', jobName);
}

/**
 * The actual Glue ETL script (Python/PySpark)
 */
const glueETLScript = `
import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'SOURCE_PATH', 'TARGET_PATH'])

sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read from S3
datasource = glueContext.create_dynamic_frame.from_options(
    format_options={"multiline": False},
    connection_type="s3",
    format="json",
    connection_options={
        "paths": [args['SOURCE_PATH']],
        "recurse": True
    },
    transformation_ctx="datasource"
)

# Apply transformations
mapped = ApplyMapping.apply(
    frame=datasource,
    mappings=[
        ("event_timestamp", "string", "event_timestamp", "timestamp"),
        ("user_id", "string", "user_id", "string"),
        ("event_type", "string", "event_type", "string"),
        ("properties", "string", "properties", "string"),
    ],
    transformation_ctx="mapped"
)

# Convert to Parquet and write
glueContext.write_dynamic_frame.from_options(
    frame=mapped,
    connection_type="s3",
    format="parquet",
    connection_options={
        "path": args['TARGET_PATH'],
        "partitionKeys": ["year", "month", "day"]
    },
    format_options={
        "compression": "snappy"
    },
    transformation_ctx="datasink"
)

job.commit()
`;

export { createGlueETLJob, glueETLScript };
```

---

### 4. Athena Queries

```typescript
/**
 * Athena Query Execution
 * SDK Version: @aws-sdk/client-athena ^3.650.0
 */

import {
  AthenaClient,
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  CreateNamedQueryCommand,
} from '@aws-sdk/client-athena';

const athenaClient = new AthenaClient({});

async function executeQuery(
  query: string,
  database: string,
  outputLocation: string
): Promise<string> {
  const command = new StartQueryExecutionCommand({
    QueryString: query,
    QueryExecutionContext: {
      Database: database,
    },
    ResultConfiguration: {
      OutputLocation: outputLocation,
      EncryptionConfiguration: {
        EncryptionOption: 'SSE_S3',
      },
    },
  });

  const response = await athenaClient.send(command);
  const queryExecutionId = response.QueryExecutionId!;

  // Wait for query to complete
  await waitForQueryCompletion(queryExecutionId);

  return queryExecutionId;
}

async function waitForQueryCompletion(queryExecutionId: string): Promise<void> {
  while (true) {
    const command = new GetQueryExecutionCommand({ QueryExecutionId: queryExecutionId });
    const response = await athenaClient.send(command);

    const status = response.QueryExecution?.Status?.State;

    if (status === 'SUCCEEDED') {
      console.log('Query succeeded:', queryExecutionId);
      return;
    } else if (status === 'FAILED' || status === 'CANCELLED') {
      throw new Error(
        `Query ${status}: ${response.QueryExecution?.Status?.StateChangeReason}`
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function getQueryResults(queryExecutionId: string): Promise<any[]> {
  const command = new GetQueryResultsCommand({
    QueryExecutionId: queryExecutionId,
    MaxResults: 1000,
  });

  const response = await athenaClient.send(command);
  const rows = response.ResultSet?.Rows || [];

  // Skip header row
  return rows.slice(1).map((row) => {
    const data: any = {};
    row.Data?.forEach((col, idx) => {
      const header = rows[0].Data?.[idx].VarCharValue || `col_${idx}`;
      data[header] = col.VarCharValue;
    });
    return data;
  });
}

/**
 * Common analytics queries
 */
export const AnalyticsQueries = {
  dailyActiveUsers: `
    SELECT
      DATE(event_timestamp) as date,
      COUNT(DISTINCT user_id) as dau
    FROM events
    WHERE event_timestamp >= CURRENT_DATE - INTERVAL '30' DAY
    GROUP BY DATE(event_timestamp)
    ORDER BY date DESC
  `,

  topEvents: `
    SELECT
      event_type,
      COUNT(*) as event_count,
      COUNT(DISTINCT user_id) as unique_users
    FROM events
    WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7' DAY
    GROUP BY event_type
    ORDER BY event_count DESC
    LIMIT 20
  `,

  userFunnel: `
    WITH user_events AS (
      SELECT
        user_id,
        CASE
          WHEN event_type = 'page_view' THEN 1
          WHEN event_type = 'add_to_cart' THEN 2
          WHEN event_type = 'checkout' THEN 3
          WHEN event_type = 'purchase' THEN 4
        END as step
      FROM events
      WHERE event_timestamp >= CURRENT_DATE - INTERVAL '7' DAY
    )
    SELECT
      step,
      COUNT(DISTINCT user_id) as users
    FROM user_events
    WHERE step IS NOT NULL
    GROUP BY step
    ORDER BY step
  `,
};

export { executeQuery, getQueryResults };
```

---

## Data Flow

1. **Ingestion**: Kinesis Streams ← Application events
2. **Storage**: Kinesis Firehose → S3 (raw/)
3. **Transform**: Lambda/Glue → S3 (processed/)
4. **Catalog**: Glue Crawler → Glue Catalog
5. **Query**: Athena → Results
6. **Visualize**: QuickSight → Dashboards

---

## Best Practices

1. **Partitioning**: Year/Month/Day/Hour for efficient queries
2. **Compression**: gzip for raw, Snappy for Parquet
3. **Schema Evolution**: Glue Catalog versioning
4. **Cost Optimization**: Lifecycle policies, Intelligent-Tiering
5. **Monitoring**: CloudWatch metrics for all components

---

See [implementation](./implementation/) for complete examples.
