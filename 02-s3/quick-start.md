# S3 Quick Start Guide

Quick reference for common S3 operations using AWS SDK for JavaScript v3.

## Setup

```typescript
import { S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({ region: 'us-east-1' });
```

## Create Bucket

```typescript
import { CreateBucketCommand } from '@aws-sdk/client-s3';

const command = new CreateBucketCommand({
  Bucket: 'my-unique-bucket-name-123',
  // For regions other than us-east-1
  CreateBucketConfiguration: {
    LocationConstraint: 'us-west-2'
  }
});

await client.send(command);
```

## Upload File (PUT)

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const fileContent = readFileSync('./myfile.txt');

const command = new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/myfile.txt',
  Body: fileContent,
  ContentType: 'text/plain',
  Metadata: {
    uploadedBy: 'john-doe',
    environment: 'production'
  }
});

const response = await client.send(command);
console.log('ETag:', response.ETag);
```

## Upload with Encryption

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';

const command = new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'secure-file.txt',
  Body: fileContent,
  ServerSideEncryption: 'AES256', // SSE-S3
  // Or use KMS
  // ServerSideEncryption: 'aws:kms',
  // SSEKMSKeyId: 'arn:aws:kms:region:account:key/key-id'
});

await client.send(command);
```

## Download File (GET)

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { writeFileSync } from 'fs';

const command = new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/myfile.txt'
});

const response = await client.send(command);

// Convert stream to buffer
const bodyContents = await response.Body.transformToString();
writeFileSync('./downloaded-file.txt', bodyContents);

// Or to bytes
const bodyBytes = await response.Body.transformToByteArray();
```

## List Objects

```typescript
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

const command = new ListObjectsV2Command({
  Bucket: 'my-bucket',
  Prefix: 'uploads/', // Optional: filter by prefix
  MaxKeys: 100 // Optional: limit results
});

const response = await client.send(command);

for (const object of response.Contents || []) {
  console.log(`${object.Key} - ${object.Size} bytes`);
}
```

## List with Pagination

```typescript
import { paginateListObjectsV2 } from '@aws-sdk/client-s3';

const paginator = paginateListObjectsV2(
  { client },
  { Bucket: 'my-bucket', Prefix: 'uploads/' }
);

for await (const page of paginator) {
  for (const object of page.Contents || []) {
    console.log(object.Key);
  }
}
```

## Delete Object

```typescript
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

const command = new DeleteObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/myfile.txt'
});

await client.send(command);
```

## Delete Multiple Objects

```typescript
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';

const command = new DeleteObjectsCommand({
  Bucket: 'my-bucket',
  Delete: {
    Objects: [
      { Key: 'file1.txt' },
      { Key: 'file2.txt' },
      { Key: 'folder/file3.txt' }
    ],
    Quiet: false // Set to true to suppress successful deletion responses
  }
});

const response = await client.send(command);

console.log('Deleted:', response.Deleted);
console.log('Errors:', response.Errors);
```

## Copy Object

```typescript
import { CopyObjectCommand } from '@aws-sdk/client-s3';

const command = new CopyObjectCommand({
  Bucket: 'destination-bucket',
  CopySource: '/source-bucket/path/to/file.txt',
  Key: 'new-path/file.txt'
});

await client.send(command);
```

## Multipart Upload (Large Files)

```typescript
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream } from 'fs';

const upload = new Upload({
  client,
  params: {
    Bucket: 'my-bucket',
    Key: 'large-file.zip',
    Body: createReadStream('./large-file.zip')
  },
  // Optional: Configure part size and concurrency
  partSize: 5 * 1024 * 1024, // 5 MB
  queueSize: 4 // 4 concurrent uploads
});

upload.on('httpUploadProgress', (progress) => {
  console.log(`Uploaded: ${progress.loaded}/${progress.total} bytes`);
});

await upload.done();
```

## Generate Presigned URL (Temporary Access)

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const command = new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'private-file.pdf'
});

// URL expires in 1 hour
const url = await getSignedUrl(client, command, { expiresIn: 3600 });

console.log('Download URL:', url);
// Share this URL with users for temporary access
```

## Presigned URL for Upload

```typescript
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const command = new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'uploads/user-file.jpg',
  ContentType: 'image/jpeg'
});

const url = await getSignedUrl(client, command, { expiresIn: 3600 });

// Users can upload to this URL using HTTP PUT
console.log('Upload URL:', url);
```

## Enable Versioning

```typescript
import { PutBucketVersioningCommand } from '@aws-sdk/client-s3';

const command = new PutBucketVersioningCommand({
  Bucket: 'my-bucket',
  VersioningConfiguration: {
    Status: 'Enabled', // or 'Suspended'
    MFADelete: 'Disabled' // 'Enabled' requires MFA
  }
});

await client.send(command);
```

## List Object Versions

```typescript
import { ListObjectVersionsCommand } from '@aws-sdk/client-s3';

const command = new ListObjectVersionsCommand({
  Bucket: 'my-bucket',
  Prefix: 'path/to/file.txt'
});

const response = await client.send(command);

for (const version of response.Versions || []) {
  console.log(`Version: ${version.VersionId}`);
  console.log(`Last Modified: ${version.LastModified}`);
  console.log(`Is Latest: ${version.IsLatest}`);
}
```

## Set Bucket Policy

```typescript
import { PutBucketPolicyCommand } from '@aws-sdk/client-s3';

const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'PublicReadGetObject',
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: 'arn:aws:s3:::my-bucket/public/*'
    }
  ]
};

const command = new PutBucketPolicyCommand({
  Bucket: 'my-bucket',
  Policy: JSON.stringify(policy)
});

await client.send(command);
```

## Set Lifecycle Policy

```typescript
import { PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';

const command = new PutBucketLifecycleConfigurationCommand({
  Bucket: 'my-bucket',
  LifecycleConfiguration: {
    Rules: [
      {
        Id: 'DeleteOldVersions',
        Status: 'Enabled',
        NoncurrentVersionExpiration: {
          NoncurrentDays: 30
        }
      },
      {
        Id: 'TransitionToGlacier',
        Status: 'Enabled',
        Transitions: [
          {
            Days: 90,
            StorageClass: 'GLACIER'
          }
        ],
        Filter: {
          Prefix: 'archives/'
        }
      }
    ]
  }
});

await client.send(command);
```

## Enable CORS

```typescript
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';

const command = new PutBucketCorsCommand({
  Bucket: 'my-bucket',
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedMethods: ['GET', 'PUT', 'POST'],
        AllowedOrigins: ['https://example.com'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000
      }
    ]
  }
});

await client.send(command);
```

## Configure Event Notifications

```typescript
import { PutBucketNotificationConfigurationCommand } from '@aws-sdk/client-s3';

const command = new PutBucketNotificationConfigurationCommand({
  Bucket: 'my-bucket',
  NotificationConfiguration: {
    LambdaFunctionConfigurations: [
      {
        LambdaFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:ProcessImage',
        Events: ['s3:ObjectCreated:*'],
        Filter: {
          Key: {
            FilterRules: [
              { Name: 'prefix', Value: 'uploads/' },
              { Name: 'suffix', Value: '.jpg' }
            ]
          }
        }
      }
    ]
  }
});

await client.send(command);
```

## S3 Select (Query Data)

```typescript
import { SelectObjectContentCommand } from '@aws-sdk/client-s3';

const command = new SelectObjectContentCommand({
  Bucket: 'my-bucket',
  Key: 'data.csv',
  ExpressionType: 'SQL',
  Expression: 'SELECT * FROM S3Object WHERE age > 30',
  InputSerialization: {
    CSV: {
      FileHeaderInfo: 'USE',
      RecordDelimiter: '\n',
      FieldDelimiter: ','
    }
  },
  OutputSerialization: {
    CSV: {
      RecordDelimiter: '\n',
      FieldDelimiter: ','
    }
  }
});

const response = await client.send(command);

// Process the event stream
for await (const event of response.Payload) {
  if (event.Records) {
    console.log(event.Records.Payload.toString());
  }
}
```

## Enable Transfer Acceleration

```typescript
import { PutBucketAccelerateConfigurationCommand } from '@aws-sdk/client-s3';

const command = new PutBucketAccelerateConfigurationCommand({
  Bucket: 'my-bucket',
  AccelerateConfiguration: {
    Status: 'Enabled'
  }
});

await client.send(command);

// Use accelerated endpoint
const acceleratedClient = new S3Client({
  region: 'us-east-1',
  useAccelerateEndpoint: true
});
```

## Error Handling

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

try {
  const command = new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'file.txt',
    Body: 'content'
  });

  await client.send(command);
} catch (error: any) {
  if (error.name === 'NoSuchBucket') {
    console.error('Bucket does not exist');
  } else if (error.name === 'AccessDenied') {
    console.error('Access denied - check IAM permissions');
  } else if (error.name === 'InvalidBucketName') {
    console.error('Invalid bucket name');
  } else if (error.$metadata?.httpStatusCode === 403) {
    console.error('Forbidden - check bucket policy');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Best Practices Checklist

```typescript
// ✅ Use environment-based configuration
const bucketName = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION || 'us-east-1';

// ✅ Enable versioning for important data
await enableVersioning(bucketName);

// ✅ Use lifecycle policies for cost optimization
await setLifecyclePolicy(bucketName, lifecycleRules);

// ✅ Enable default encryption
import { PutBucketEncryptionCommand } from '@aws-sdk/client-s3';
await client.send(new PutBucketEncryptionCommand({
  Bucket: bucketName,
  ServerSideEncryptionConfiguration: {
    Rules: [{
      ApplyServerSideEncryptionByDefault: {
        SSEAlgorithm: 'AES256'
      }
    }]
  }
}));

// ✅ Block public access
import { PutPublicAccessBlockCommand } from '@aws-sdk/client-s3';
await client.send(new PutPublicAccessBlockCommand({
  Bucket: bucketName,
  PublicAccessBlockConfiguration: {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true
  }
}));

// ✅ Use presigned URLs instead of public access
const presignedUrl = await getSignedUrl(client, getCommand, { expiresIn: 3600 });

// ✅ Tag resources for cost allocation
const tags = [
  { Key: 'Environment', Value: 'production' },
  { Key: 'Project', Value: 'web-app' },
  { Key: 'CostCenter', Value: 'engineering' }
];
```

## Common Storage Class Use Cases

```typescript
// Frequently accessed data
StorageClass: 'STANDARD'

// Infrequent access (backups, DR)
StorageClass: 'STANDARD_IA'

// Archive with instant retrieval
StorageClass: 'GLACIER_IR'

// Long-term archive
StorageClass: 'GLACIER'

// Lowest cost archive (compliance)
StorageClass: 'DEEP_ARCHIVE'

// Automatic optimization
StorageClass: 'INTELLIGENT_TIERING'
```

## Next Steps

- Review [Complete S3 Guide](./README.md)
- Explore [35+ Examples](./examples/)
- Study [System Design Patterns](./system-design.md)
- Practice with real data
