# AWS S3 (Simple Storage Service) - Comprehensive Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Storage Classes](#storage-classes)
4. [Security & Encryption](#security--encryption)
5. [Best Practices](#best-practices)
6. [Examples Index](#examples-index)
7. [System Design Patterns](#system-design-patterns)

---

## Overview

Amazon S3 is object storage built to store and retrieve any amount of data from anywhere. It's highly durable (99.999999999%), scalable, and forms the backbone of many AWS architectures.

### What You'll Learn
- Bucket and object operations
- Multipart upload for large files
- Presigned URLs for temporary access
- Versioning and lifecycle management
- Encryption (SSE-S3, SSE-KMS, SSE-C)
- S3 Select and Glacier integration
- CloudFront CDN integration
- Event notifications and triggers
- Cross-region replication
- S3 Batch Operations

---

## Core Concepts

### Buckets
- Containers for objects
- Globally unique names
- Regional resources
- Flat structure (no true folders)
- Up to 100 buckets per account (soft limit)

### Objects
- Fundamental entities stored in S3
- Key-value pairs
- Size: 0 bytes to 5 TB
- Metadata and tags
- Versioning support

### Keys
- Unique identifier within a bucket
- Can include prefixes (simulating folders)
- Example: `users/john/profile.jpg`

### Storage Model
```
Account
 └── Buckets (global namespace)
      └── Objects (identified by keys)
           ├── Data (the file content)
           ├── Metadata (system and user-defined)
           ├── Version ID (if versioning enabled)
           └── Access Control (ACL, bucket policy)
```

---

## Storage Classes

### S3 Standard
- 99.99% availability
- 11 9's durability
- Low latency, high throughput
- Use case: Frequently accessed data

### S3 Intelligent-Tiering
- Automatic cost optimization
- Moves data between tiers based on access patterns
- No retrieval fees
- Use case: Unknown or changing access patterns

### S3 Standard-IA (Infrequent Access)
- Lower storage cost
- Retrieval fee applies
- 99.9% availability
- Use case: Backups, disaster recovery

### S3 One Zone-IA
- Single AZ storage
- Lower cost than Standard-IA
- 99.5% availability
- Use case: Secondary backup copies

### S3 Glacier Instant Retrieval
- Archive storage with instant access
- Cheaper than Standard-IA
- Millisecond retrieval
- Use case: Long-term archives with instant access needs

### S3 Glacier Flexible Retrieval
- Archive storage
- Retrieval: 1-5 minutes (expedited) to 3-5 hours (standard)
- Very low cost
- Use case: Archive data accessed 1-2 times/year

### S3 Glacier Deep Archive
- Lowest cost storage
- Retrieval: 12-48 hours
- Use case: Long-term retention (7-10 years)

---

## Security & Encryption

### Access Control Methods

1. **IAM Policies**
   - User/role-based permissions
   - Fine-grained control

2. **Bucket Policies**
   - Resource-based permissions
   - JSON document attached to bucket
   - Cross-account access

3. **Access Control Lists (ACLs)**
   - Legacy method
   - Object-level permissions

4. **S3 Block Public Access**
   - Account and bucket level
   - Prevents accidental public exposure

### Encryption Types

1. **Server-Side Encryption (SSE)**
   - **SSE-S3**: S3-managed keys (AES-256)
   - **SSE-KMS**: AWS KMS-managed keys
   - **SSE-C**: Customer-provided keys

2. **Client-Side Encryption**
   - Encrypt before upload
   - Manage your own keys

3. **Encryption in Transit**
   - HTTPS/TLS
   - Enforce with bucket policy

### Bucket Policy Example
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Deny",
    "Principal": "*",
    "Action": "s3:*",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "Bool": {
        "aws:SecureTransport": "false"
      }
    }
  }]
}
```

---

## Best Practices

### Performance

1. **Use Multipart Upload**
   - Files > 100 MB
   - Parallel uploads
   - Resume failed uploads

2. **Request Rate Performance**
   - S3 automatically scales
   - 3,500 PUT/COPY/POST/DELETE requests per second per prefix
   - 5,500 GET/HEAD requests per second per prefix

3. **Transfer Acceleration**
   - CloudFront edge locations
   - 50-500% faster over long distances

4. **S3 Select**
   - Retrieve subset of data
   - SQL queries on objects
   - Reduce data transfer

### Cost Optimization

1. **Lifecycle Policies**
   - Transition to cheaper storage classes
   - Delete old versions
   - Expire incomplete multipart uploads

2. **Intelligent-Tiering**
   - Automatic optimization
   - No operational overhead

3. **Compression**
   - Compress before upload
   - Reduce storage and transfer costs

4. **CloudFront**
   - Cache frequently accessed content
   - Reduce S3 requests

### Security

1. **Enable Versioning**
   - Protect against accidental deletion
   - Compliance requirements

2. **Enable MFA Delete**
   - Extra protection for delete operations

3. **Server Access Logging**
   - Audit bucket access
   - Security analysis

4. **Object Lock**
   - WORM (Write Once Read Many)
   - Regulatory compliance

5. **CloudTrail**
   - API call logging
   - Security auditing

---

## Examples Index

### Basic Operations (1-10)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 01 | [Basic Upload](./examples/01-basic-upload.ts) | Upload files to S3 | ⭐ |
| 02 | [Download Objects](./examples/02-download-objects.ts) | Download and stream objects | ⭐ |
| 03 | [List Objects](./examples/03-list-objects.ts) | List bucket contents with pagination | ⭐ |
| 04 | [Delete Objects](./examples/04-delete-objects.ts) | Delete single and multiple objects | ⭐ |
| 05 | [Multipart Upload](./examples/05-multipart-upload.ts) | Upload large files in parts | ⭐⭐ |
| 06 | [Presigned URLs](./examples/06-presigned-urls.ts) | Generate temporary access URLs | ⭐⭐ |
| 07 | [Bucket Operations](./examples/07-bucket-operations.ts) | Create, configure, delete buckets | ⭐ |
| 08 | [Object Metadata](./examples/08-object-metadata.ts) | Set and retrieve metadata | ⭐ |
| 09 | [Copy Objects](./examples/09-copy-objects.ts) | Copy objects within/across buckets | ⭐ |
| 10 | [Object Tagging](./examples/10-object-tagging.ts) | Add and manage object tags | ⭐ |

### Intermediate Operations (11-20)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 11 | [Versioning](./examples/11-versioning.ts) | Enable and manage object versions | ⭐⭐ |
| 12 | [Lifecycle Policies](./examples/12-lifecycle-policies.ts) | Automate transitions and expiration | ⭐⭐ |
| 13 | [Server-Side Encryption](./examples/13-encryption.ts) | SSE-S3, SSE-KMS, SSE-C | ⭐⭐ |
| 14 | [Bucket Policies](./examples/14-bucket-policies.ts) | Configure bucket access policies | ⭐⭐ |
| 15 | [CORS Configuration](./examples/15-cors-config.ts) | Set up cross-origin resource sharing | ⭐⭐ |
| 16 | [Static Website Hosting](./examples/16-static-website.ts) | Host static websites on S3 | ⭐⭐ |
| 17 | [Event Notifications](./examples/17-event-notifications.ts) | Trigger Lambda/SNS/SQS on events | ⭐⭐⭐ |
| 18 | [S3 Select](./examples/18-s3-select.ts) | Query data with SQL | ⭐⭐ |
| 19 | [Inventory Reports](./examples/19-inventory.ts) | Generate inventory reports | ⭐⭐ |
| 20 | [Transfer Acceleration](./examples/20-transfer-acceleration.ts) | Fast long-distance transfers | ⭐⭐ |

### Advanced Operations (21-30)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 21 | [Cross-Region Replication](./examples/21-crr.ts) | Replicate across regions | ⭐⭐⭐ |
| 22 | [Same-Region Replication](./examples/22-srr.ts) | Replicate within region | ⭐⭐⭐ |
| 23 | [Object Lock](./examples/23-object-lock.ts) | WORM compliance | ⭐⭐⭐ |
| 24 | [Batch Operations](./examples/24-batch-operations.ts) | Bulk object operations | ⭐⭐⭐ |
| 25 | [Intelligent-Tiering](./examples/25-intelligent-tiering.ts) | Configure automatic tiering | ⭐⭐ |
| 26 | [CloudFront Integration](./examples/26-cloudfront-integration.ts) | CDN setup with S3 origin | ⭐⭐⭐ |
| 27 | [Glacier Operations](./examples/27-glacier.ts) | Archive and restore | ⭐⭐⭐ |
| 28 | [S3 Access Points](./examples/28-access-points.ts) | Simplified access management | ⭐⭐⭐ |
| 29 | [Block Public Access](./examples/29-block-public-access.ts) | Prevent public exposure | ⭐⭐ |
| 30 | [Storage Lens](./examples/30-storage-lens.ts) | Organization-wide visibility | ⭐⭐⭐ |

### Bonus Examples (31-35)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 31 | [Streaming Upload](./examples/31-streaming-upload.ts) | Stream uploads for large files | ⭐⭐⭐ |
| 32 | [Image Processing Pipeline](./examples/32-image-processing.ts) | Resize/optimize images on upload | ⭐⭐⭐ |
| 33 | [Data Lake Architecture](./examples/33-data-lake.ts) | Build data lake on S3 | ⭐⭐⭐ |
| 34 | [Cost Analysis](./examples/34-cost-analysis.ts) | Analyze and optimize costs | ⭐⭐⭐ |
| 35 | [Security Audit](./examples/35-security-audit.ts) | Comprehensive security review | ⭐⭐⭐ |

---

## System Design Patterns

See [system-design.md](./system-design.md) for detailed patterns:

1. **Static Website with CloudFront CDN**
   - S3 bucket → CloudFront → Route53
   - Global distribution with caching

2. **Data Lake Architecture**
   - Raw → Processed → Curated zones
   - Athena for querying
   - Glue for ETL

3. **Media Processing Pipeline**
   - Upload → Lambda trigger → Processing
   - Multiple resolutions and formats

4. **Backup and Disaster Recovery**
   - Cross-region replication
   - Glacier for long-term retention
   - Versioning for protection

5. **Serverless File Processing**
   - S3 → EventBridge → Lambda → DynamoDB
   - Automatic metadata extraction

---

## Performance Optimization

### Naming Strategy
```
Good: Randomized prefixes for high throughput
my-bucket/a1b2c3d4/file1.jpg
my-bucket/e5f6g7h8/file2.jpg
my-bucket/i9j0k1l2/file3.jpg

Poor: Sequential or timestamp-based prefixes
my-bucket/2024/01/01/file1.jpg
my-bucket/2024/01/01/file2.jpg
my-bucket/2024/01/01/file3.jpg
```

### Multipart Upload Thresholds
```typescript
File Size           | Strategy
--------------------+---------------------------
< 100 MB           | Single PUT operation
100 MB - 5 GB      | Multipart upload
> 5 GB             | Multipart upload (required)
```

### Transfer Acceleration
- Use for: Uploads from geographically distant clients
- Cost: Additional per-GB fee
- Benefit: 50-500% faster transfers

---

## Cost Optimization Strategies

### 1. Storage Class Analysis
Monitor access patterns and transition to appropriate storage classes.

### 2. Lifecycle Policies
```typescript
const lifecycleRules = [
  {
    // Transition to IA after 30 days
    id: 'TransitionToIA',
    status: 'Enabled',
    transitions: [{
      days: 30,
      storageClass: 'STANDARD_IA'
    }]
  },
  {
    // Move to Glacier after 90 days
    id: 'ArchiveOldData',
    status: 'Enabled',
    transitions: [{
      days: 90,
      storageClass: 'GLACIER'
    }]
  },
  {
    // Delete after 365 days
    id: 'DeleteOldData',
    status: 'Enabled',
    expiration: { days: 365 }
  }
];
```

### 3. Intelligent-Tiering
Automatic cost optimization with no operational overhead.

### 4. Compression
Compress data before upload to reduce storage and transfer costs.

---

## Monitoring and Logging

### CloudWatch Metrics
- BucketRequests
- BucketBytes
- 4xxErrors, 5xxErrors
- FirstByteLatency
- TotalRequestLatency

### S3 Server Access Logs
```
79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be
my-bucket [06/Feb/2024:00:00:01 +0000] 192.0.2.3
79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be
3E57427F3EXAMPLE REST.GET.VERSIONING - "GET /my-bucket?versioning HTTP/1.1"
200 - 113 - 7 - "-" "S3Console/0.4"
```

### CloudTrail Events
- API call logging
- Data events (object-level)
- Management events (bucket-level)

---

## Integration Patterns

### Lambda Integration
```typescript
// S3 event → Lambda trigger
const eventSource = {
  type: 'S3',
  bucket: 'my-bucket',
  events: ['s3:ObjectCreated:*'],
  filter: {
    prefix: 'uploads/',
    suffix: '.jpg'
  }
};
```

### Athena Integration
```sql
-- Query S3 data with Athena
CREATE EXTERNAL TABLE logs (
  timestamp STRING,
  user_id STRING,
  action STRING
)
STORED AS PARQUET
LOCATION 's3://my-bucket/logs/';

SELECT * FROM logs WHERE action = 'purchase';
```

### Glue Integration
```typescript
// ETL jobs on S3 data
const glueJob = {
  source: 's3://raw-data/',
  transform: 'convert to parquet',
  destination: 's3://processed-data/'
};
```

---

## Common Patterns and Anti-Patterns

### ✅ Good Patterns

1. **Use Lifecycle Policies**
   ```typescript
   await putBucketLifecycleConfiguration(bucket, lifecycleRules);
   ```

2. **Enable Versioning for Critical Data**
   ```typescript
   await putBucketVersioning(bucket, { Status: 'Enabled' });
   ```

3. **Use Presigned URLs for Temporary Access**
   ```typescript
   const url = await getSignedUrl(client, command, { expiresIn: 3600 });
   ```

### ❌ Anti-Patterns

1. **Public Buckets**
   ```typescript
   // DON'T: Make entire bucket public
   // DO: Use presigned URLs or CloudFront
   ```

2. **No Encryption**
   ```typescript
   // DON'T: Store sensitive data unencrypted
   // DO: Enable default encryption
   ```

3. **Ignoring Costs**
   ```typescript
   // DON'T: Keep all data in Standard storage
   // DO: Use lifecycle policies and appropriate storage classes
   ```

---

## Troubleshooting Guide

### Access Denied
1. Check IAM policies
2. Verify bucket policies
3. Check ACLs
4. Verify Block Public Access settings

### Slow Uploads
1. Use multipart upload for large files
2. Enable Transfer Acceleration
3. Check network bandwidth
4. Use CloudFront for downloads

### High Costs
1. Review storage class usage
2. Implement lifecycle policies
3. Delete incomplete multipart uploads
4. Use S3 Storage Lens

---

## Next Steps

1. Complete all basic examples (1-10)
2. Implement lifecycle management (Example 12)
3. Set up CloudFront integration (Example 26)
4. Study system design patterns
5. Move to [EC2 Tutorial](../03-ec2/README.md)

---

**Ready to start?** Begin with [Quick Start Guide](./quick-start.md) or dive into [Example 01: Basic Upload](./examples/01-basic-upload.ts).
