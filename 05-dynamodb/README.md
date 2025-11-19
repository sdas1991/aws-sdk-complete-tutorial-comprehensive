# AWS DynamoDB - Comprehensive Guide

## Overview

Amazon DynamoDB is a fully managed NoSQL database service that provides fast and predictable performance with seamless scalability. It's designed for applications that need consistent, single-digit millisecond latency at any scale.

### What You'll Learn
- Table design and data modeling
- CRUD operations
- Queries and scans
- Global Secondary Indexes (GSI) and Local Secondary Indexes (LSI)
- DynamoDB Streams
- Transactions
- Global Tables (multi-region)
- Performance optimization
- Cost optimization strategies

---

## Core Concepts

### Tables
- Primary key (partition key + optional sort key)
- Items (rows)
- Attributes (columns)
- No fixed schema

### Primary Key Types
1. **Partition Key**: Simple primary key
2. **Composite Key**: Partition key + sort key

### Indexes
- **GSI**: Different partition/sort key, async updates
- **LSI**: Same partition key, different sort key

### Capacity Modes
- **On-Demand**: Pay per request
- **Provisioned**: Pre-allocated RCU/WCU

---

## Examples Index (35+)

### Basic Operations (1-10)
1. [Create Table](./examples/01-create-table.ts) - ⭐
2. [Put Item](./examples/02-put-item.ts) - ⭐
3. [Get Item](./examples/03-get-item.ts) - ⭐
4. [Update Item](./examples/04-update-item.ts) - ⭐
5. [Delete Item](./examples/05-delete-item.ts) - ⭐
6. [Query](./examples/06-query.ts) - ⭐⭐
7. [Scan](./examples/07-scan.ts) - ⭐
8. [Batch Write](./examples/08-batch-write.ts) - ⭐⭐
9. [Batch Get](./examples/09-batch-get.ts) - ⭐⭐
10. [Conditional Writes](./examples/10-conditional-writes.ts) - ⭐⭐

### Intermediate (11-20)
11. [Transactions](./examples/11-transactions.ts) - ⭐⭐⭐
12. [Global Secondary Index](./examples/12-gsi.ts) - ⭐⭐
13. [Local Secondary Index](./examples/13-lsi.ts) - ⭐⭐
14. [DynamoDB Streams](./examples/14-streams.ts) - ⭐⭐⭐
15. [Time To Live (TTL)](./examples/15-ttl.ts) - ⭐
16. [Point-in-Time Recovery](./examples/16-pitr.ts) - ⭐⭐
17. [Global Tables](./examples/17-global-tables.ts) - ⭐⭐⭐
18. [PartiQL Queries](./examples/18-partiql.ts) - ⭐⭐
19. [Expression Attributes](./examples/19-expressions.ts) - ⭐⭐
20. [Pagination](./examples/20-pagination.ts) - ⭐

### Advanced (21-30)
21. [Single Table Design](./examples/21-single-table-design.ts) - ⭐⭐⭐
22. [Access Patterns](./examples/22-access-patterns.ts) - ⭐⭐⭐
23. [Data Modeling](./examples/23-data-modeling.ts) - ⭐⭐⭐
24. [Hot Partitions](./examples/24-hot-partitions.ts) - ⭐⭐⭐
25. [Capacity Planning](./examples/25-capacity-planning.ts) - ⭐⭐⭐
26. [Backup and Restore](./examples/26-backup-restore.ts) - ⭐⭐
27. [Export to S3](./examples/27-export-s3.ts) - ⭐⭐
28. [Import from S3](./examples/28-import-s3.ts) - ⭐⭐
29. [DynamoDB Accelerator (DAX)](./examples/29-dax.ts) - ⭐⭐⭐
30. [Monitoring and Metrics](./examples/30-monitoring.ts) - ⭐⭐

### Expert (31-35)
31. [Cost Optimization](./examples/31-cost-optimization.ts) - ⭐⭐⭐
32. [Change Data Capture](./examples/32-cdc.ts) - ⭐⭐⭐
33. [Multi-Tenant Patterns](./examples/33-multi-tenant.ts) - ⭐⭐⭐
34. [GraphQL Integration](./examples/34-appsync.ts) - ⭐⭐⭐
35. [Production Patterns](./examples/35-production-patterns.ts) - ⭐⭐⭐

---

## Data Modeling Best Practices

### 1. Understand Access Patterns
Define all access patterns before designing schema

### 2. Denormalization
Embrace denormalization for read performance

### 3. One Table Design
Use single table for related data

### 4. Composite Keys
Leverage partition + sort key effectively

### 5. GSIs for Flexibility
Add GSIs for different query patterns

---

## Performance Optimization

1. **Use BatchGetItem/BatchWriteItem** for multiple items
2. **Implement exponential backoff** for throttling
3. **Use projection expressions** to reduce data transfer
4. **Parallel scans** for large table scans
5. **DAX** for read-heavy workloads
6. **Sparse indexes** to reduce storage costs

---

## Quick Start

See [quick-start.md](./quick-start.md) for rapid implementation.
