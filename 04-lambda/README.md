# AWS Lambda - Comprehensive Guide

## Overview

AWS Lambda is a serverless compute service that runs your code in response to events and automatically manages the computing resources. It's a core component of serverless architectures on AWS.

### What You'll Learn
- Function creation and deployment
- Event sources and triggers
- Environment variables and configuration
- Layers and dependencies
- Async invocation and error handling
- Performance optimization
- Integration with other AWS services
- Monitoring and troubleshooting

---

## Core Concepts

### Function
- Code + configuration
- Executes in response to triggers
- Isolated execution environment
- Auto-scaling

### Runtime
- Node.js, Python, Java, Go, .NET, Ruby
- Custom runtimes (using Lambda Layers)
- Container image support

### Handler
- Entry point for Lambda function
- Receives event and context

### Execution Role
- IAM role assumed by Lambda
- Grants permissions to AWS services

---

## Examples Index (30+)

### Basic Operations (1-10)
1. [Create Function](./examples/01-create-function.ts) - ⭐
2. [Invoke Function](./examples/02-invoke-function.ts) - ⭐
3. [Update Function Code](./examples/03-update-code.ts) - ⭐
4. [Environment Variables](./examples/04-environment-variables.ts) - ⭐
5. [Delete Function](./examples/05-delete-function.ts) - ⭐
6. [List Functions](./examples/06-list-functions.ts) - ⭐
7. [Function Configuration](./examples/07-function-config.ts) - ⭐⭐
8. [Async Invocation](./examples/08-async-invocation.ts) - ⭐⭐
9. [Event Source Mapping](./examples/09-event-source-mapping.ts) - ⭐⭐
10. [Lambda Aliases](./examples/10-aliases.ts) - ⭐⭐

### Intermediate (11-20)
11. [Function Versioning](./examples/11-versioning.ts) - ⭐⭐
12. [Lambda Layers](./examples/12-layers.ts) - ⭐⭐
13. [VPC Configuration](./examples/13-vpc-config.ts) - ⭐⭐⭐
14. [Reserved Concurrency](./examples/14-concurrency.ts) - ⭐⭐
15. [Dead Letter Queue](./examples/15-dlq.ts) - ⭐⭐
16. [Container Images](./examples/16-container-images.ts) - ⭐⭐⭐
17. [Lambda Extensions](./examples/17-extensions.ts) - ⭐⭐⭐
18. [Function URLs](./examples/18-function-urls.ts) - ⭐⭐
19. [CloudWatch Integration](./examples/19-cloudwatch.ts) - ⭐⭐
20. [X-Ray Tracing](./examples/20-xray.ts) - ⭐⭐

### Advanced (21-30)
21. [Step Functions Integration](./examples/21-step-functions.ts) - ⭐⭐⭐
22. [EventBridge Integration](./examples/22-eventbridge.ts) - ⭐⭐⭐
23. [API Gateway Integration](./examples/23-api-gateway.ts) - ⭐⭐⭐
24. [S3 Event Triggers](./examples/24-s3-triggers.ts) - ⭐⭐
25. [DynamoDB Streams](./examples/25-dynamodb-streams.ts) - ⭐⭐⭐
26. [SQS Integration](./examples/26-sqs-integration.ts) - ⭐⭐
27. [Kinesis Integration](./examples/27-kinesis.ts) - ⭐⭐⭐
28. [Lambda@Edge](./examples/28-lambda-edge.ts) - ⭐⭐⭐
29. [Performance Optimization](./examples/29-performance.ts) - ⭐⭐⭐
30. [CI/CD Pipeline](./examples/30-cicd.ts) - ⭐⭐⭐

### Bonus (31-35)
31. [Cost Optimization](./examples/31-cost-optimization.ts) - ⭐⭐⭐
32. [Security Best Practices](./examples/32-security.ts) - ⭐⭐⭐
33. [Custom Runtimes](./examples/33-custom-runtime.ts) - ⭐⭐⭐
34. [Multi-Region Deployment](./examples/34-multi-region.ts) - ⭐⭐⭐
35. [Complete Serverless App](./examples/35-complete-app.ts) - ⭐⭐⭐

---

## Best Practices

### Performance
1. Minimize cold starts
2. Optimize package size
3. Use layers for dependencies
4. Enable X-Ray tracing
5. Set appropriate memory/timeout

### Security
1. Least privilege IAM roles
2. Encrypt environment variables
3. Use VPC when needed
4. Secrets in AWS Secrets Manager
5. Enable CloudTrail logging

### Cost Optimization
1. Right-size memory allocation
2. Use provisioned concurrency wisely
3. Implement proper error handling
4. Monitor and optimize duration
5. Use Lambda Power Tuning

---

## Quick Start

See [quick-start.md](./quick-start.md) for rapid implementation.
