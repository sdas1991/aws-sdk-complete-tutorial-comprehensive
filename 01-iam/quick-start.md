# IAM Quick Start Guide

Quick reference for common IAM operations using AWS SDK for JavaScript v3.

## Setup

```typescript
import { IAMClient } from '@aws-sdk/client-iam';

const client = new IAMClient({ region: 'us-east-1' }); // IAM is global, but region required
```

## Create User

```typescript
import { CreateUserCommand } from '@aws-sdk/client-iam';

const command = new CreateUserCommand({
  UserName: 'john-doe',
  Tags: [
    { Key: 'Environment', Value: 'development' },
    { Key: 'Team', Value: 'platform' }
  ]
});

const response = await client.send(command);
console.log('User created:', response.User);
```

## Create Role

```typescript
import { CreateRoleCommand } from '@aws-sdk/client-iam';

const trustPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { Service: 'lambda.amazonaws.com' },
      Action: 'sts:AssumeRole'
    }
  ]
};

const command = new CreateRoleCommand({
  RoleName: 'LambdaExecutionRole',
  AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
  Description: 'Role for Lambda function execution'
});

const response = await client.send(command);
```

## Create Policy

```typescript
import { CreatePolicyCommand } from '@aws-sdk/client-iam';

const policyDocument = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Action: ['s3:GetObject', 's3:PutObject'],
      Resource: 'arn:aws:s3:::my-bucket/*'
    }
  ]
};

const command = new CreatePolicyCommand({
  PolicyName: 'S3ReadWritePolicy',
  PolicyDocument: JSON.stringify(policyDocument),
  Description: 'Allow read/write access to specific S3 bucket'
});

const response = await client.send(command);
```

## Attach Policy to Role

```typescript
import { AttachRolePolicyCommand } from '@aws-sdk/client-iam';

const command = new AttachRolePolicyCommand({
  RoleName: 'LambdaExecutionRole',
  PolicyArn: 'arn:aws:iam::123456789012:policy/S3ReadWritePolicy'
});

await client.send(command);
```

## Assume Role (STS)

```typescript
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';

const stsClient = new STSClient({ region: 'us-east-1' });

const command = new AssumeRoleCommand({
  RoleArn: 'arn:aws:iam::123456789012:role/LambdaExecutionRole',
  RoleSessionName: 'my-session',
  DurationSeconds: 3600 // 1 hour
});

const response = await stsClient.send(command);
const credentials = response.Credentials;

// Use temporary credentials
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: credentials.AccessKeyId,
    secretAccessKey: credentials.SecretAccessKey,
    sessionToken: credentials.SessionToken
  }
});
```

## List Users

```typescript
import { ListUsersCommand } from '@aws-sdk/client-iam';

const command = new ListUsersCommand({});
const response = await client.send(command);

for (const user of response.Users) {
  console.log(`User: ${user.UserName}, Created: ${user.CreateDate}`);
}
```

## Create Access Key

```typescript
import { CreateAccessKeyCommand } from '@aws-sdk/client-iam';

const command = new CreateAccessKeyCommand({
  UserName: 'john-doe'
});

const response = await client.send(command);
console.log('Access Key ID:', response.AccessKey.AccessKeyId);
console.log('Secret Access Key:', response.AccessKey.SecretAccessKey);
// Store these securely! They are only shown once.
```

## Enable MFA

```typescript
import { EnableMFADeviceCommand } from '@aws-sdk/client-iam';

const command = new EnableMFADeviceCommand({
  UserName: 'john-doe',
  SerialNumber: 'arn:aws:iam::123456789012:mfa/john-doe',
  AuthenticationCode1: '123456', // First MFA code
  AuthenticationCode2: '789012'  // Second MFA code (30 seconds later)
});

await client.send(command);
```

## Cross-Account Role Access

```typescript
// In Account A: Create role with trust policy for Account B
const trustPolicy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: 'arn:aws:iam::ACCOUNT_B:root' },
      Action: 'sts:AssumeRole',
      Condition: {
        StringEquals: { 'sts:ExternalId': 'unique-external-id' }
      }
    }
  ]
};

// In Account B: Assume the role
const command = new AssumeRoleCommand({
  RoleArn: 'arn:aws:iam::ACCOUNT_A:role/CrossAccountRole',
  RoleSessionName: 'cross-account-session',
  ExternalId: 'unique-external-id'
});
```

## Permission Boundary

```typescript
import { PutUserPermissionsBoundaryCommand } from '@aws-sdk/client-iam';

const command = new PutUserPermissionsBoundaryCommand({
  UserName: 'john-doe',
  PermissionsBoundary: 'arn:aws:iam::123456789012:policy/DeveloperBoundary'
});

await client.send(command);
```

## Policy Simulator

```typescript
import { SimulatePrincipalPolicyCommand } from '@aws-sdk/client-iam';

const command = new SimulatePrincipalPolicyCommand({
  PolicySourceArn: 'arn:aws:iam::123456789012:user/john-doe',
  ActionNames: ['s3:GetObject'],
  ResourceArns: ['arn:aws:s3:::my-bucket/*']
});

const response = await client.send(command);
for (const result of response.EvaluationResults) {
  console.log(`Action: ${result.EvalActionName}`);
  console.log(`Decision: ${result.EvalDecision}`);
}
```

## Common Error Handling

```typescript
import { IAMClient, CreateUserCommand } from '@aws-sdk/client-iam';

try {
  const command = new CreateUserCommand({ UserName: 'john-doe' });
  const response = await client.send(command);
  console.log('User created:', response.User);
} catch (error) {
  if (error.name === 'EntityAlreadyExistsException') {
    console.log('User already exists');
  } else if (error.name === 'LimitExceededException') {
    console.log('IAM entity limit exceeded');
  } else if (error.name === 'InvalidInputException') {
    console.log('Invalid input:', error.message);
  } else {
    console.error('Error creating user:', error);
    throw error;
  }
}
```

## Best Practices Checklist

```typescript
// ✅ Use environment-based configuration
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: undefined // Use default credential chain
};

// ✅ Implement retry logic
const client = new IAMClient({
  ...config,
  maxAttempts: 3,
  retryMode: 'adaptive'
});

// ✅ Add proper logging
import { Logger } from '@utils/logger';
const logger = new Logger('IAM');

try {
  const response = await client.send(command);
  logger.info('User created successfully', { userName: response.User.UserName });
} catch (error) {
  logger.error('Failed to create user', { error, userName: 'john-doe' });
  throw error;
}

// ✅ Use resource tagging
const tags = [
  { Key: 'Environment', Value: process.env.ENVIRONMENT },
  { Key: 'ManagedBy', Value: 'terraform' },
  { Key: 'CostCenter', Value: 'engineering' }
];

// ✅ Implement least privilege
// Start restrictive, expand as needed

// ✅ Use roles, not users for applications
// Applications should assume roles, not use IAM user credentials
```

## Common Policy Patterns

### S3 Bucket Access
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/app-data/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket",
      "Condition": {
        "StringLike": {
          "s3:prefix": "app-data/*"
        }
      }
    }
  ]
}
```

### DynamoDB Table Access
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/MyTable"
    }
  ]
}
```

### Lambda Execution Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

### EC2 Instance Role
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::deployment-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:app/*"
    }
  ]
}
```

## Next Steps

- Review [Complete IAM Guide](./README.md)
- Explore [30+ Examples](./examples/)
- Study [System Design Patterns](./system-design.md)
- Practice with [Interactive Labs](./tests/)
