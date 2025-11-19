# AWS IAM (Identity and Access Management) - Comprehensive Guide

## Table of Contents
1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [IAM Components](#iam-components)
4. [Best Practices](#best-practices)
5. [Examples Index](#examples-index)
6. [System Design Patterns](#system-design-patterns)
7. [Production Considerations](#production-considerations)

---

## Overview

AWS Identity and Access Management (IAM) is the foundation of AWS security. It enables you to manage access to AWS services and resources securely. Understanding IAM is critical for any AWS infrastructure work.

### What You'll Learn
- User, Group, and Role Management
- Policy creation and evaluation
- Federation and SSO integration
- Cross-account access patterns
- Service-linked roles and permissions
- ABAC (Attribute-Based Access Control)
- Permission boundaries and SCPs
- Security best practices and compliance

---

## Core Concepts

### 1. Principals
Entities that can make requests to AWS:
- **IAM Users**: Long-term credentials for people or applications
- **IAM Roles**: Temporary credentials assumed by trusted entities
- **Federated Users**: Users from external identity providers
- **AWS Services**: Services acting on your behalf

### 2. Authentication
**Who are you?**
- Username/Password (Console)
- Access Key ID/Secret Access Key (API/CLI/SDK)
- MFA (Multi-Factor Authentication)
- Federated authentication (SAML, OIDC)

### 3. Authorization
**What can you do?**
- Policies define permissions
- Evaluation logic determines access
- Effect: Allow or Deny
- Actions: What operations can be performed
- Resources: Which resources can be accessed
- Conditions: When permissions apply

### 4. IAM Policies

#### Policy Types
1. **Identity-based policies**: Attached to users, groups, or roles
2. **Resource-based policies**: Attached to resources (S3, Lambda, etc.)
3. **Permission boundaries**: Maximum permissions for an entity
4. **Service Control Policies (SCPs)**: Organization/OU-level controls
5. **Access Control Lists (ACLs)**: Legacy resource-based policies
6. **Session policies**: Limit assumed role permissions

#### Policy Structure
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "203.0.113.0/24"
        }
      }
    }
  ]
}
```

### 5. Policy Evaluation Logic

```
┌─────────────────────────────────────────────────┐
│ 1. Deny by default                              │
├─────────────────────────────────────────────────┤
│ 2. Evaluate all applicable policies             │
├─────────────────────────────────────────────────┤
│ 3. Explicit DENY → ✗ Access Denied             │
├─────────────────────────────────────────────────┤
│ 4. Explicit ALLOW → ✓ Access Granted           │
├─────────────────────────────────────────────────┤
│ 5. No match → ✗ Access Denied (implicit deny)  │
└─────────────────────────────────────────────────┘
```

---

## IAM Components

### Users
- Long-term credentials
- Direct human or application access
- Maximum 5,000 users per account
- Can belong to multiple groups

### Groups
- Collection of users
- Policies attached to group apply to all members
- Users can be in up to 10 groups
- No nesting (groups cannot contain groups)

### Roles
- No long-term credentials
- Assumed by trusted entities
- Temporary security credentials via STS
- Cross-account access
- Service roles for AWS services

### Policies
- JSON documents defining permissions
- Customer managed vs AWS managed
- Inline vs Managed policies
- Maximum policy size: 6,144 characters (managed), 10,240 (inline)

---

## Best Practices

### Security Best Practices

1. **Enable MFA for all users** (especially root and privileged users)
2. **Use roles instead of users** for applications and services
3. **Apply least privilege principle**
4. **Rotate credentials regularly**
5. **Use strong password policies**
6. **Enable CloudTrail for audit logging**
7. **Never use root account for day-to-day operations**
8. **Use IAM Access Analyzer** to identify unintended access
9. **Implement permission boundaries** for delegated administration
10. **Use SCPs** to enforce organizational guardrails

### Operational Best Practices

1. **Use IAM roles for EC2 instances** instead of embedding credentials
2. **Implement cross-account roles** for multi-account strategies
3. **Use AWS SSO** for centralized access management
4. **Tag IAM resources** for better organization
5. **Monitor with CloudWatch and GuardDuty**
6. **Regular access reviews** and removal of unused credentials
7. **Use policy conditions** for fine-grained control
8. **Implement resource-based policies** where appropriate
9. **Version control your policies** in Git
10. **Automate IAM with Infrastructure as Code**

### Compliance Best Practices

1. **Document all privilege escalation paths**
2. **Implement separation of duties**
3. **Use AWS Config rules** for compliance monitoring
4. **Regular security audits**
5. **Incident response procedures**

---

## Examples Index

### Basic Examples (1-10)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 01 | [Basic User Management](./examples/01-basic-user-management.ts) | Create, list, update, delete users | ⭐ |
| 02 | [Role Management](./examples/02-role-management.ts) | Create and manage IAM roles | ⭐ |
| 03 | [Policy Management](./examples/03-policy-management.ts) | Create and attach policies | ⭐ |
| 04 | [Group Management](./examples/04-group-management.ts) | Manage user groups | ⭐ |
| 05 | [Access Key Management](./examples/05-access-key-management.ts) | Create and rotate access keys | ⭐⭐ |
| 06 | [Password Policy](./examples/06-password-policy.ts) | Configure account password policy | ⭐ |
| 07 | [MFA Management](./examples/07-mfa-management.ts) | Enable and manage MFA devices | ⭐⭐ |
| 08 | [Service-Linked Roles](./examples/08-service-linked-roles.ts) | Work with service-linked roles | ⭐⭐ |
| 09 | [Policy Simulator](./examples/09-policy-simulator.ts) | Test IAM policies | ⭐⭐ |
| 10 | [Credential Reports](./examples/10-credential-reports.ts) | Generate credential reports | ⭐ |

### Intermediate Examples (11-20)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 11 | [Assume Role](./examples/11-assume-role.ts) | Assume IAM roles with STS | ⭐⭐ |
| 12 | [Cross-Account Access](./examples/12-cross-account-access.ts) | Set up cross-account roles | ⭐⭐⭐ |
| 13 | [Permission Boundaries](./examples/13-permission-boundaries.ts) | Implement permission boundaries | ⭐⭐⭐ |
| 14 | [SAML Federation](./examples/14-saml-federation.ts) | Configure SAML 2.0 federation | ⭐⭐⭐ |
| 15 | [OIDC Federation](./examples/15-oidc-federation.ts) | Set up OIDC identity provider | ⭐⭐⭐ |
| 16 | [Session Policies](./examples/16-session-policies.ts) | Use session policies with AssumeRole | ⭐⭐ |
| 17 | [Policy Conditions](./examples/17-policy-conditions.ts) | Advanced condition keys | ⭐⭐⭐ |
| 18 | [Resource-Based Policies](./examples/18-resource-based-policies.ts) | Implement resource-based policies | ⭐⭐ |
| 19 | [IAM Access Analyzer](./examples/19-iam-access-analyzer.ts) | Analyze external access | ⭐⭐ |
| 20 | [Tag-Based Access Control](./examples/20-tag-based-access.ts) | Implement ABAC with tags | ⭐⭐⭐ |

### Advanced Examples (21-30)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 21 | [Service Control Policies](./examples/21-service-control-policies.ts) | Manage SCPs in AWS Organizations | ⭐⭐⭐ |
| 22 | [AWS SSO Integration](./examples/22-aws-sso-integration.ts) | Integrate with AWS SSO | ⭐⭐⭐ |
| 23 | [AssumeRoleWithWebIdentity](./examples/23-assume-role-web-identity.ts) | Web identity federation | ⭐⭐⭐ |
| 24 | [Instance Profile Management](./examples/24-instance-profile-management.ts) | Manage EC2 instance profiles | ⭐⭐ |
| 25 | [Policy Versioning](./examples/25-policy-versioning.ts) | Version and rollback policies | ⭐⭐ |
| 26 | [Trust Policy Patterns](./examples/26-trust-policy-patterns.ts) | Common trust policy scenarios | ⭐⭐⭐ |
| 27 | [Least Privilege Scanner](./examples/27-least-privilege-scanner.ts) | Analyze and reduce permissions | ⭐⭐⭐ |
| 28 | [Custom Authorization](./examples/28-custom-authorization.ts) | Build custom authorization logic | ⭐⭐⭐ |
| 29 | [Multi-Account Strategy](./examples/29-multi-account-strategy.ts) | Implement multi-account IAM | ⭐⭐⭐ |
| 30 | [IAM Automation Pipeline](./examples/30-iam-automation-pipeline.ts) | Full IAM automation with approval | ⭐⭐⭐ |

### Bonus Examples (31-35)

| # | Example | Description | Complexity |
|---|---------|-------------|------------|
| 31 | [Break Glass Access](./examples/31-break-glass-access.ts) | Emergency access procedures | ⭐⭐⭐ |
| 32 | [Compliance Automation](./examples/32-compliance-automation.ts) | Automated compliance checks | ⭐⭐⭐ |
| 33 | [Just-In-Time Access](./examples/33-jit-access.ts) | Temporary privilege elevation | ⭐⭐⭐ |
| 34 | [IAM Policy Generator](./examples/34-policy-generator.ts) | Generate policies from CloudTrail | ⭐⭐⭐ |
| 35 | [IAM Security Audit](./examples/35-security-audit.ts) | Comprehensive security audit | ⭐⭐⭐ |

---

## System Design Patterns

See [system-design.md](./system-design.md) for detailed patterns:

1. **Multi-Account Organization Pattern**
   - Central IAM account
   - Cross-account role assumption
   - AWS Organizations + SCPs

2. **Least Privilege Automation**
   - CloudTrail → Lambda → Policy refinement
   - Periodic access reviews
   - Automated permission reduction

3. **Federated Access Pattern**
   - Corporate IdP → SAML → AWS
   - OIDC for application access
   - AWS SSO for unified access

4. **Service-to-Service Communication**
   - IAM roles for Lambda, ECS, EC2
   - Resource-based policies for cross-service
   - VPC endpoints with IAM policies

5. **Break Glass Procedures**
   - Emergency access roles
   - Monitoring and alerting
   - Post-incident reviews

---

## Production Considerations

### Monitoring and Alerting

```typescript
// Monitor IAM changes
- CloudTrail: Log all IAM API calls
- CloudWatch Events: Real-time notifications
- GuardDuty: Threat detection
- Config Rules: Compliance monitoring
- Access Analyzer: Continuous analysis
```

### High Availability

- IAM is a global service (highly available by default)
- Implement redundant authentication mechanisms
- Multiple admin users with MFA
- Break glass procedures for emergencies

### Cost Optimization

- IAM itself has no cost
- Minimize API calls for policy evaluation
- Use managed policies for shared permissions
- Regular cleanup of unused users/roles

### Security Hardening

```typescript
// Security checklist
✓ Root account MFA enabled
✓ All privileged users have MFA
✓ No long-term access keys for users
✓ Regular key rotation (90 days)
✓ CloudTrail enabled in all regions
✓ AWS Config monitoring IAM resources
✓ GuardDuty enabled for anomaly detection
✓ Access Analyzer enabled
✓ Strong password policy enforced
✓ No wildcard permissions in production
```

### Performance Optimization

- Cache policy evaluation results
- Use inline policies sparingly (harder to manage)
- Limit number of managed policies per entity (10 max)
- Optimize condition evaluation

---

## Common Patterns and Anti-Patterns

### ✅ Good Patterns

1. **Use Roles for EC2/Lambda**
   ```typescript
   // Attach role to EC2 instance
   const role = await createRoleForEC2();
   await attachInstanceProfile(instanceId, role);
   ```

2. **Least Privilege Policies**
   ```json
   {
     "Effect": "Allow",
     "Action": "s3:GetObject",
     "Resource": "arn:aws:s3:::specific-bucket/specific-prefix/*"
   }
   ```

3. **Use AWS Managed Policies as Templates**
   ```typescript
   // Start with managed policy, create custom version
   const basePolicy = await getPolicy('ReadOnlyAccess');
   const customPolicy = restrictPolicy(basePolicy, conditions);
   ```

### ❌ Anti-Patterns

1. **Wildcard Everything**
   ```json
   // DON'T DO THIS
   {
     "Effect": "Allow",
     "Action": "*",
     "Resource": "*"
   }
   ```

2. **Long-Lived Access Keys**
   ```typescript
   // DON'T: Store access keys in code
   const client = new S3Client({
     credentials: {
       accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
       secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
     }
   });
   ```

3. **Sharing Root Account**
   ```typescript
   // DON'T: Use root account for operations
   // DO: Create admin users with MFA
   ```

---

## Integration with Other Services

### Kubernetes (EKS)
- [IRSA (IAM Roles for Service Accounts)](../15-eks/examples/05-irsa-setup.ts)
- Pod Identity
- OIDC Provider setup

### Terraform
- [IAM Terraform Modules](../terraform/modules/iam/README.md)
- State bucket access policies
- Dynamic role creation

### CI/CD
- CodePipeline service roles
- Cross-account deployment roles
- OIDC for GitHub Actions

---

## Troubleshooting Guide

### Common Issues

1. **Access Denied Errors**
   ```bash
   # Check policy evaluation
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::123456789012:user/Alice \
     --action-names s3:GetObject \
     --resource-arns arn:aws:s3:::my-bucket/*
   ```

2. **AssumeRole Failures**
   - Check trust policy
   - Verify MFA requirements
   - Check session duration limits
   - Verify external ID (if required)

3. **Policy Size Limits**
   - Use managed policies for shared permissions
   - Break large policies into smaller ones
   - Use resource-based policies where possible

---

## Quick Reference

### Common AWS Managed Policies

```typescript
// Read-only access
'arn:aws:iam::aws:policy/ReadOnlyAccess'

// Power user (no IAM)
'arn:aws:iam::aws:policy/PowerUserAccess'

// Admin access
'arn:aws:iam::aws:policy/AdministratorAccess'

// Specific services
'arn:aws:iam::aws:policy/AmazonS3FullAccess'
'arn:aws:iam::aws:policy/AmazonEC2FullAccess'
'arn:aws:iam::aws:policy/AWSLambdaFullAccess'
```

### Useful IAM CLI Commands

```bash
# List users
aws iam list-users

# Get user details
aws iam get-user --user-name alice

# Create access key
aws iam create-access-key --user-name alice

# Simulate policy
aws iam simulate-principal-policy \
  --policy-source-arn <ARN> \
  --action-names <actions> \
  --resource-arns <resources>

# Get credential report
aws iam generate-credential-report
aws iam get-credential-report

# Decode authorization message
aws sts decode-authorization-message \
  --encoded-message <encoded-message>
```

---

## Learning Resources

- [AWS IAM Documentation](https://docs.aws.amazon.com/IAM/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [IAM Policy Reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies.html)
- [AWS Security Blog](https://aws.amazon.com/blogs/security/)

---

## Next Steps

1. Complete all basic examples (1-10)
2. Implement cross-account access (Example 12)
3. Study system design patterns
4. Practice with IAM Access Analyzer
5. Move to [S3 Tutorial](../02-s3/README.md)

---

**Ready to start?** Begin with [Quick Start Guide](./quick-start.md) or dive into [Example 01: Basic User Management](./examples/01-basic-user-management.ts).
