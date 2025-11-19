# System Design: Serverless Web Application

## Architecture
```
CloudFront → S3 Static Site → API Gateway → Lambda → DynamoDB
                    ↓
              Cognito Auth
```

## SDK Implementation
```typescript
import { CognitoIdentityProviderClient, CreateUserPoolCommand } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client, PutBucketWebsiteCommand } from '@aws-sdk/client-s3';
import { CloudFrontClient, CreateDistributionCommand } from '@aws-sdk/client-cloudfront';

// Cognito User Pool
async function createUserPool() {
  const client = new CognitoIdentityProviderClient({});
  return await client.send(
    new CreateUserPoolCommand({
      PoolName: 'web-app-users',
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireUppercase: true,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
        },
      },
      MfaConfiguration: 'OPTIONAL',
      AutoVerifiedAttributes: ['email'],
    })
  );
}

// S3 Static Website
async function setupStaticWebsite(bucketName: string) {
  const client = new S3Client({});
  return await client.send(
    new PutBucketWebsiteCommand({
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: { Suffix: 'index.html' },
        ErrorDocument: { Key: 'error.html' },
      },
    })
  );
}
```

## Benefits
- Zero server management
- Auto-scaling
- Pay per use
- Global distribution
