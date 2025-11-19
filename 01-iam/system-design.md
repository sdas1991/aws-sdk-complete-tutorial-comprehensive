# IAM System Design Patterns

This document covers real-world system design patterns and architecture scenarios involving IAM.

## Table of Contents

1. [Multi-Account Organization Pattern](#1-multi-account-organization-pattern)
2. [Least Privilege Automation](#2-least-privilege-automation)
3. [Federated Access Architecture](#3-federated-access-architecture)
4. [Service-to-Service Communication](#4-service-to-service-communication)
5. [Break Glass Emergency Access](#5-break-glass-emergency-access)
6. [Just-In-Time Access](#6-just-in-time-access)
7. [Multi-Tenant SaaS IAM](#7-multi-tenant-saas-iam)
8. [CI/CD Pipeline Security](#8-cicd-pipeline-security)

---

## 1. Multi-Account Organization Pattern

### Scenario
Large enterprise with multiple teams, environments, and workloads requiring isolation and centralized governance.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS Organizations                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Management Account (Root)                             │ │
│  │  - SCPs for organization-wide policies                 │ │
│  │  - CloudTrail organization trail                       │ │
│  │  - AWS SSO configuration                              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────┬─────────────────┬───────────────────┐ │
│  │  Security OU    │  Production OU  │  Development OU   │ │
│  │                 │                 │                   │ │
│  │  - Audit Logs   │  - Prod Apps    │  - Dev/Test Apps  │ │
│  │  - Security Hub │  - Critical DB  │  - Experiments    │ │
│  │  - GuardDuty    │                 │                   │ │
│  └─────────────────┴─────────────────┴───────────────────┘ │
└─────────────────────────────────────────────────────────────┘

Cross-Account Access Flow:
Developer (Dev Account) → AssumeRole → Production Account
```

### Implementation

```typescript
// 1. Create organization structure
import { OrganizationsClient, CreateOrganizationCommand } from '@aws-sdk/client-organizations';

async function setupMultiAccountOrganization() {
  // Create organization
  const org = await createOrganization();

  // Create OUs
  const securityOU = await createOU('Security', org.Id);
  const prodOU = await createOU('Production', org.Id);
  const devOU = await createOU('Development', org.Id);

  // Create accounts
  const auditAccount = await createAccount('audit@example.com', 'audit-logs');
  const prodAccount = await createAccount('prod@example.com', 'production-workloads');

  // Move accounts to OUs
  await moveAccountToOU(auditAccount.Id, securityOU.Id);
  await moveAccountToOU(prodAccount.Id, prodOU.Id);

  // Apply SCPs
  await attachSCP(securityOU.Id, 'DenyUnapprovedRegions');
  await attachSCP(prodOU.Id, 'RequireEncryption');
}

// 2. Cross-account role for developers
const crossAccountTrustPolicy = {
  Version: '2012-10-17',
  Statement: [{
    Effect: 'Allow',
    Principal: {
      AWS: 'arn:aws:iam::DEV_ACCOUNT_ID:root'
    },
    Action: 'sts:AssumeRole',
    Condition: {
      StringEquals: {
        'sts:ExternalId': 'unique-external-id-12345'
      },
      IpAddress: {
        'aws:SourceIp': ['10.0.0.0/8', '172.16.0.0/12'] // VPN/office IPs
      }
    }
  }]
};

// 3. SCP to enforce tagging
const enforceTaggingSCP = {
  Version: '2012-10-17',
  Statement: [{
    Effect: 'Deny',
    Action: [
      'ec2:RunInstances',
      's3:CreateBucket',
      'rds:CreateDBInstance'
    ],
    Resource: '*',
    Condition: {
      'Null': {
        'aws:RequestTag/Environment': 'true',
        'aws:RequestTag/Owner': 'true',
        'aws:RequestTag/CostCenter': 'true'
      }
    }
  }]
};
```

### Best Practices

1. **Separate Security Account**: Centralized logging and security tooling
2. **SCPs for Guardrails**: Prevent dangerous actions across all accounts
3. **AWS SSO**: Single sign-on for human access
4. **Cross-Account Roles**: Service-to-service communication
5. **Tag-Based Cost Allocation**: Track spending per team/project

---

## 2. Least Privilege Automation

### Scenario
Automatically identify and remove unused permissions to maintain least privilege.

### Architecture

```
CloudTrail Events → EventBridge → Lambda → IAM Access Analyzer
                                    ↓
                              Generate Policy
                                    ↓
                              Review & Approve
                                    ↓
                              Update IAM Policy
```

### Implementation

```typescript
// Monitor CloudTrail and generate least-privilege policies
import { CloudTrailClient } from '@aws-sdk/client-cloudtrail';
import { IAMClient, SimulatePrincipalPolicyCommand } from '@aws-sdk/client-iam';

async function generateLeastPrivilegePolicy(principalArn: string, days: number = 90) {
  // 1. Analyze CloudTrail events for the principal
  const events = await getCloudTrailEvents(principalArn, days);

  // 2. Extract unique actions and resources
  const actionsUsed = new Set<string>();
  const resourcesAccessed = new Map<string, Set<string>>();

  for (const event of events) {
    const action = `${event.eventSource.replace('.amazonaws.com', '')}:${event.eventName}`;
    actionsUsed.add(action);

    if (!resourcesAccessed.has(action)) {
      resourcesAccessed.set(action, new Set());
    }
    if (event.resources) {
      event.resources.forEach(r => resourcesAccessed.get(action)!.add(r.ARN));
    }
  }

  // 3. Generate policy document
  const statements = Array.from(actionsUsed).map(action => {
    const resources = Array.from(resourcesAccessed.get(action) || ['*']);
    return {
      Effect: 'Allow',
      Action: action,
      Resource: resources.length > 0 ? resources : '*'
    };
  });

  const policy = {
    Version: '2012-10-17',
    Statement: statements
  };

  // 4. Test policy with simulator
  await validatePolicy(principalArn, policy);

  return policy;
}

// Periodic access review
async function reviewUnusedPermissions(roleName: string) {
  const analyzer = new AccessAnalyzerClient({});

  // Get last accessed information
  const lastAccessed = await getServiceLastAccessed(roleName);

  // Identify unused services (not accessed in 90 days)
  const unusedServices = lastAccessed.filter(
    s => s.LastAuthenticated < Date.now() - 90 * 24 * 60 * 60 * 1000
  );

  console.log('Unused services:', unusedServices);

  // Generate recommendations
  return {
    role: roleName,
    recommendations: unusedServices.map(s => ({
      service: s.ServiceName,
      lastAccessed: s.LastAuthenticated,
      action: 'REMOVE_PERMISSION'
    }))
  };
}
```

---

## 3. Federated Access Architecture

### Scenario
Enterprise SSO integration with AWS using SAML 2.0 or OIDC.

### Architecture

```
Corporate IdP (Okta/Azure AD)
         ↓
    SAML 2.0 / OIDC
         ↓
   AWS SSO / IAM Identity Provider
         ↓
  AssumeRoleWithSAML / AssumeRoleWithWebIdentity
         ↓
   Temporary AWS Credentials
         ↓
   Access AWS Resources
```

### Implementation

```typescript
// SAML Federation Setup
async function setupSAMLFederation(
  samlMetadataDocument: string,
  providerName: string
) {
  const iamClient = new IAMClient({});

  // 1. Create SAML provider
  const createProviderCommand = new CreateSAMLProviderCommand({
    SAMLMetadataDocument: samlMetadataDocument,
    Name: providerName
  });
  const provider = await iamClient.send(createProviderCommand);

  // 2. Create federated role
  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: {
        Federated: provider.SAMLProviderArn
      },
      Action: 'sts:AssumeRoleWithSAML',
      Condition: {
        StringEquals: {
          'SAML:aud': 'https://signin.aws.amazon.com/saml'
        }
      }
    }]
  };

  const role = await createRole('FederatedAdminRole', trustPolicy);

  // 3. Attach permissions
  await attachPolicyToRole(
    'FederatedAdminRole',
    'arn:aws:iam::aws:policy/AdministratorAccess'
  );

  return { provider, role };
}

// GitHub Actions OIDC Integration
async function setupGitHubOIDC(githubOrg: string, githubRepo: string) {
  // 1. Create OIDC provider for GitHub
  const oidcProvider = await createOpenIDConnectProvider({
    Url: 'https://token.actions.githubusercontent.com',
    ClientIDList: ['sts.amazonaws.com'],
    ThumbprintList: ['6938fd4d98bab03faadb97b34396831e3780aea1']
  });

  // 2. Create role for GitHub Actions
  const trustPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: {
        Federated: oidcProvider.Arn
      },
      Action: 'sts:AssumeRoleWithWebIdentity',
      Condition: {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com'
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:*`
        }
      }
    }]
  };

  const role = await createRole('GitHubActionsRole', trustPolicy);

  return role;
}
```

---

## 4. Service-to-Service Communication

### Scenario
Microservices architecture where services need to communicate securely.

### Architecture

```
Lambda Function (Service A)
    ↓ (Execution Role)
  Assume Role
    ↓
Service B Role (with resource-based policy)
    ↓
Access DynamoDB / S3 / etc.
```

### Implementation

```typescript
// Lambda → DynamoDB → S3 pattern
async function setupMicroserviceIAM() {
  // 1. Lambda execution role
  const lambdaRole = await createRole(
    'OrderProcessorLambdaRole',
    {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }]
    }
  );

  // 2. Policy for Lambda
  const lambdaPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:PutItem', 'dynamodb:GetItem'],
        Resource: 'arn:aws:dynamodb:*:*:table/Orders'
      },
      {
        Effect: 'Allow',
        Action: ['s3:PutObject'],
        Resource: 'arn:aws:s3:::order-receipts/*'
      },
      {
        Effect: 'Allow',
        Action: ['sqs:SendMessage'],
        Resource: 'arn:aws:sqs:*:*:order-notifications'
      },
      {
        Effect: 'Allow',
        Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        Resource: '*'
      }
    ]
  };

  await attachInlinePolicy(lambdaRole.RoleName, 'LambdaPermissions', lambdaPolicy);

  // 3. Resource-based policy for S3 bucket
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: {
        AWS: lambdaRole.Arn
      },
      Action: 's3:PutObject',
      Resource: 'arn:aws:s3:::order-receipts/*',
      Condition: {
        StringEquals: {
          's3:x-amz-server-side-encryption': 'AES256'
        }
      }
    }]
  };

  return { lambdaRole, bucketPolicy };
}
```

---

## 5. Break Glass Emergency Access

### Scenario
Emergency access procedures for critical incidents.

### Architecture

```
Emergency Incident
    ↓
Manual Approval (Manager + Security)
    ↓
Time-Limited Role Activation
    ↓
CloudWatch Alarm + SNS Notification
    ↓
Detailed CloudTrail Logging
    ↓
Post-Incident Review
```

### Implementation

```typescript
async function createBreakGlassRole() {
  // 1. Create break glass role
  const role = await createRole(
    'BreakGlassEmergencyAccess',
    {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: {
          AWS: 'arn:aws:iam::ACCOUNT_ID:root'
        },
        Action: 'sts:AssumeRole',
        Condition: {
          Bool: {
            'aws:MultiFactorAuthPresent': 'true'
          },
          NumericLessThan: {
            'aws:MultiFactorAuthAge': '3600' // Must re-auth every hour
          }
        }
      }]
    }
  );

  // 2. Attach admin policy
  await attachPolicyToRole(
    'BreakGlassEmergencyAccess',
    'arn:aws:iam::aws:policy/AdministratorAccess'
  );

  // 3. Create CloudWatch alarm for break glass usage
  const alarm = await createBreakGlassAlarm(role.Arn);

  // 4. SNS topic for notifications
  const topic = await createSNSTopic('break-glass-notifications');
  await subscribeToTopic(topic, 'security-team@example.com');

  return { role, alarm, topic };
}

// Monitor break glass usage
async function monitorBreakGlassAccess() {
  const query = `
    fields @timestamp, userIdentity.arn, eventName, sourceIPAddress
    | filter userIdentity.sessionContext.sessionIssuer.arn = "arn:aws:iam::*:role/BreakGlassEmergencyAccess"
    | sort @timestamp desc
  `;

  // Run CloudWatch Logs Insights query
  const results = await queryCloudWatchLogs(query);

  // Send to security team
  await sendSecurityAlert(results);
}
```

---

## 6. Just-In-Time Access

### Scenario
Temporary privilege elevation for specific tasks.

### Implementation

```typescript
async function requestJITAccess(
  userId: string,
  roleName: string,
  duration: number, // minutes
  justification: string
) {
  // 1. Validate request
  const isApproved = await getApproval(userId, roleName, justification);

  if (!isApproved) {
    throw new Error('Access request denied');
  }

  // 2. Create time-limited session
  const stsClient = new STSClient({});
  const assumeRoleResult = await stsClient.send(new AssumeRoleCommand({
    RoleArn: `arn:aws:iam::ACCOUNT_ID:role/${roleName}`,
    RoleSessionName: `jit-${userId}-${Date.now()}`,
    DurationSeconds: duration * 60,
    Tags: [
      { Key: 'JITAccess', Value: 'true' },
      { Key: 'RequestedBy', Value: userId },
      { Key: 'Justification', Value: justification }
    ]
  }));

  // 3. Log access grant
  await logAccessGrant(userId, roleName, duration, justification);

  // 4. Schedule automatic revocation
  await scheduleRevocation(userId, duration);

  return assumeRoleResult.Credentials;
}
```

---

## 7. Multi-Tenant SaaS IAM

### Scenario
SaaS application with tenant isolation using IAM.

### Implementation

```typescript
// Dynamic IAM policies per tenant
async function createTenantIsolation(tenantId: string) {
  // 1. Create role for tenant
  const role = await createRole(
    `TenantRole-${tenantId}`,
    {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'lambda.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }]
    }
  );

  // 2. Policy with tenant-specific access
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['dynamodb:*'],
        Resource: `arn:aws:dynamodb:*:*:table/TenantData`,
        Condition: {
          'ForAllValues:StringEquals': {
            'dynamodb:LeadingKeys': [tenantId]
          }
        }
      },
      {
        Effect: 'Allow',
        Action: ['s3:*'],
        Resource: [
          `arn:aws:s3:::saas-app-data/${tenantId}`,
          `arn:aws:s3:::saas-app-data/${tenantId}/*`
        ]
      }
    ]
  };

  await attachInlinePolicy(role.RoleName, 'TenantIsolation', policy);

  return role;
}
```

---

## 8. CI/CD Pipeline Security

### Scenario
Secure deployment pipeline with least privilege.

### Implementation

```typescript
async function setupCICDPipeline() {
  // 1. CodePipeline service role
  const pipelineRole = await createRole(
    'CodePipelineServiceRole',
    {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'codepipeline.amazonaws.com' },
        Action: 'sts:AssumeRole'
      }]
    }
  );

  // 2. Deployment role (assumed by CodePipeline)
  const deploymentRole = await createRole(
    'ProductionDeploymentRole',
    {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: {
          AWS: pipelineRole.Arn
        },
        Action: 'sts:AssumeRole'
      }]
    }
  );

  // 3. Least privilege deployment policy
  const deploymentPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'lambda:UpdateFunctionCode',
          'lambda:PublishVersion',
          'lambda:UpdateAlias'
        ],
        Resource: 'arn:aws:lambda:*:*:function:prod-*'
      },
      {
        Effect: 'Allow',
        Action: ['s3:GetObject'],
        Resource: 'arn:aws:s3:::deployment-artifacts/*'
      }
    ]
  };

  await attachInlinePolicy(deploymentRole.RoleName, 'DeploymentPolicy', deploymentPolicy);

  return { pipelineRole, deploymentRole };
}
```

---

## Summary

These patterns demonstrate real-world IAM architectures for:
- ✅ Security and compliance
- ✅ Scalability and maintainability
- ✅ Operational excellence
- ✅ Cost optimization

For implementation examples, see [examples directory](./examples/).
