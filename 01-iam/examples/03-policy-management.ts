/**
 * IAM Example 03: Policy Management
 *
 * This example demonstrates:
 * - Creating custom IAM policies
 * - Policy versioning and default versions
 * - Attaching/detaching policies
 * - Inline vs managed policies
 * - Policy simulation and testing
 * - Common policy patterns
 *
 * @complexity: ⭐ Basic
 */

import {
  IAMClient,
  CreatePolicyCommand,
  GetPolicyCommand,
  GetPolicyVersionCommand,
  CreatePolicyVersionCommand,
  SetDefaultPolicyVersionCommand,
  ListPolicyVersionsCommand,
  DeletePolicyVersionCommand,
  DeletePolicyCommand,
  ListPoliciesCommand,
  PutUserPolicyCommand,
  GetUserPolicyCommand,
  DeleteUserPolicyCommand,
  ListUserPoliciesCommand,
  SimulatePrincipalPolicyCommand,
} from '@aws-sdk/client-iam';

const client = new IAMClient({
  region: 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Common policy document templates
 */
const PolicyTemplates = {
  // S3 read-only access to specific bucket
  s3ReadOnly: (bucketName: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:ListBucket'],
        Resource: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`
        ],
      },
    ],
  }),

  // S3 full access with encryption requirement
  s3FullAccessWithEncryption: (bucketName: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
        Resource: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`
        ],
      },
      {
        Effect: 'Deny',
        Action: 's3:PutObject',
        Resource: `arn:aws:s3:::${bucketName}/*`,
        Condition: {
          StringNotEquals: {
            's3:x-amz-server-side-encryption': 'AES256',
          },
        },
      },
    ],
  }),

  // DynamoDB CRUD operations
  dynamoDbCrud: (tableName: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        Resource: `arn:aws:dynamodb:*:*:table/${tableName}`,
      },
    ],
  }),

  // Lambda execution with VPC access
  lambdaVpcExecution: () => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents',
        ],
        Resource: 'arn:aws:logs:*:*:*',
      },
      {
        Effect: 'Allow',
        Action: [
          'ec2:CreateNetworkInterface',
          'ec2:DescribeNetworkInterfaces',
          'ec2:DeleteNetworkInterface',
        ],
        Resource: '*',
      },
    ],
  }),

  // Tag-based access control (ABAC)
  tagBasedAccess: (tagKey: string, tagValue: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'ec2:*',
        Resource: '*',
        Condition: {
          StringEquals: {
            [`ec2:ResourceTag/${tagKey}`]: tagValue,
          },
        },
      },
    ],
  }),

  // IP-restricted access
  ipRestrictedAccess: (ipRange: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          IpAddress: {
            'aws:SourceIp': ipRange,
          },
        },
      },
      {
        Effect: 'Deny',
        Action: '*',
        Resource: '*',
        Condition: {
          NotIpAddress: {
            'aws:SourceIp': ipRange,
          },
        },
      },
    ],
  }),

  // MFA required for sensitive operations
  mfaRequired: () => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: ['ec2:StopInstances', 'ec2:TerminateInstances'],
        Resource: '*',
        Condition: {
          Bool: {
            'aws:MultiFactorAuthPresent': 'true',
          },
        },
      },
    ],
  }),

  // Time-based access
  timeBasedAccess: (startTime: string, endTime: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: '*',
        Resource: '*',
        Condition: {
          DateGreaterThan: {
            'aws:CurrentTime': startTime,
          },
          DateLessThan: {
            'aws:CurrentTime': endTime,
          },
        },
      },
    ],
  }),
};

/**
 * Create a managed IAM policy
 */
async function createManagedPolicy(
  policyName: string,
  policyDocument: any,
  description?: string
) {
  console.log(`\n📝 Creating managed policy: ${policyName}...`);

  try {
    const command = new CreatePolicyCommand({
      PolicyName: policyName,
      PolicyDocument: JSON.stringify(policyDocument),
      Description: description || `Managed policy: ${policyName}`,
    });

    const response = await client.send(command);

    console.log('✅ Policy created successfully:');
    console.log(`   Policy ARN: ${response.Policy?.Arn}`);
    console.log(`   Policy ID: ${response.Policy?.PolicyId}`);
    console.log(`   Default Version: ${response.Policy?.DefaultVersionId}`);

    return response.Policy;
  } catch (error: any) {
    if (error.name === 'EntityAlreadyExistsException') {
      console.log('⚠️  Policy already exists');
    } else if (error.name === 'MalformedPolicyDocumentException') {
      console.error('❌ Invalid policy document:', error.message);
    } else if (error.name === 'LimitExceededException') {
      console.error('❌ Policy limit exceeded');
    }
    throw error;
  }
}

/**
 * Get policy details
 */
async function getPolicyDetails(policyArn: string) {
  console.log(`\n🔍 Getting policy details...`);

  try {
    const command = new GetPolicyCommand({
      PolicyArn: policyArn,
    });

    const response = await client.send(command);
    const policy = response.Policy;

    console.log('✅ Policy details:');
    console.log(`   Policy Name: ${policy?.PolicyName}`);
    console.log(`   Policy ARN: ${policy?.Arn}`);
    console.log(`   Default Version: ${policy?.DefaultVersionId}`);
    console.log(`   Attachment Count: ${policy?.AttachmentCount}`);
    console.log(`   Permissions Boundary Usage: ${policy?.PermissionsBoundaryUsageCount}`);

    return policy;
  } catch (error: any) {
    console.error('❌ Error getting policy:', error.message);
    throw error;
  }
}

/**
 * Get specific policy version document
 */
async function getPolicyVersion(policyArn: string, versionId: string) {
  console.log(`\n📄 Getting policy version ${versionId}...`);

  try {
    const command = new GetPolicyVersionCommand({
      PolicyArn: policyArn,
      VersionId: versionId,
    });

    const response = await client.send(command);
    const document = JSON.parse(
      decodeURIComponent(response.PolicyVersion?.Document || '')
    );

    console.log('✅ Policy document:');
    console.log(JSON.stringify(document, null, 2));

    return document;
  } catch (error: any) {
    console.error('❌ Error getting policy version:', error.message);
    throw error;
  }
}

/**
 * Create a new policy version
 */
async function createPolicyVersion(
  policyArn: string,
  newPolicyDocument: any,
  setAsDefault: boolean = true
) {
  console.log(`\n📝 Creating new policy version...`);

  try {
    const command = new CreatePolicyVersionCommand({
      PolicyArn: policyArn,
      PolicyDocument: JSON.stringify(newPolicyDocument),
      SetAsDefault: setAsDefault,
    });

    const response = await client.send(command);

    console.log('✅ Policy version created:');
    console.log(`   Version ID: ${response.PolicyVersion?.VersionId}`);
    console.log(`   Is Default: ${response.PolicyVersion?.IsDefaultVersion}`);

    return response.PolicyVersion;
  } catch (error: any) {
    if (error.name === 'LimitExceededException') {
      console.error('❌ Maximum number of policy versions exceeded (max 5)');
      console.log('   Tip: Delete old versions before creating new ones');
    }
    throw error;
  }
}

/**
 * List all policy versions
 */
async function listPolicyVersions(policyArn: string) {
  console.log(`\n📋 Listing policy versions...`);

  try {
    const command = new ListPolicyVersionsCommand({
      PolicyArn: policyArn,
    });

    const response = await client.send(command);

    if (response.Versions) {
      console.log('✅ Policy versions:');
      for (const version of response.Versions) {
        console.log(`   ${version.VersionId} ${version.IsDefaultVersion ? '(default)' : ''}`);
        console.log(`      Created: ${version.CreateDate?.toISOString()}`);
      }
    }

    return response.Versions;
  } catch (error: any) {
    console.error('❌ Error listing policy versions:', error.message);
    throw error;
  }
}

/**
 * Simulate policy evaluation
 */
async function simulatePolicy(
  principalArn: string,
  actions: string[],
  resourceArns: string[]
) {
  console.log(`\n🧪 Simulating policy for principal: ${principalArn}...`);

  try {
    const command = new SimulatePrincipalPolicyCommand({
      PolicySourceArn: principalArn,
      ActionNames: actions,
      ResourceArns: resourceArns,
    });

    const response = await client.send(command);

    console.log('✅ Simulation results:');
    for (const result of response.EvaluationResults || []) {
      console.log(`\n   Action: ${result.EvalActionName}`);
      console.log(`   Resource: ${result.EvalResourceName}`);
      console.log(`   Decision: ${result.EvalDecision}`);

      if (result.MatchedStatements && result.MatchedStatements.length > 0) {
        console.log('   Matched statements:');
        for (const statement of result.MatchedStatements) {
          console.log(`      Source: ${statement.SourcePolicyId}`);
        }
      }
    }

    return response.EvaluationResults;
  } catch (error: any) {
    console.error('❌ Error simulating policy:', error.message);
    throw error;
  }
}

/**
 * Create inline policy for a user
 */
async function createInlinePolicy(
  userName: string,
  policyName: string,
  policyDocument: any
) {
  console.log(`\n📝 Creating inline policy for user: ${userName}...`);

  try {
    const command = new PutUserPolicyCommand({
      UserName: userName,
      PolicyName: policyName,
      PolicyDocument: JSON.stringify(policyDocument),
    });

    await client.send(command);
    console.log('✅ Inline policy created successfully');
  } catch (error: any) {
    console.error('❌ Error creating inline policy:', error.message);
    throw error;
  }
}

/**
 * Delete a policy (managed)
 */
async function deletePolicy(policyArn: string) {
  console.log(`\n🗑️  Deleting policy: ${policyArn}...`);

  try {
    // First, list and delete all non-default versions
    const versions = await listPolicyVersions(policyArn);
    for (const version of versions || []) {
      if (!version.IsDefaultVersion) {
        const deleteVersionCommand = new DeletePolicyVersionCommand({
          PolicyArn: policyArn,
          VersionId: version.VersionId,
        });
        await client.send(deleteVersionCommand);
        console.log(`   Deleted version: ${version.VersionId}`);
      }
    }

    // Now delete the policy
    const command = new DeletePolicyCommand({
      PolicyArn: policyArn,
    });

    await client.send(command);
    console.log('✅ Policy deleted successfully');
  } catch (error: any) {
    if (error.name === 'DeleteConflictException') {
      console.error('❌ Cannot delete policy: Policy is attached to resources');
    }
    throw error;
  }
}

/**
 * Complete example workflow
 */
async function runExample(): Promise<void> {
  console.log('🚀 IAM Policy Management Example');
  console.log('==================================\n');

  const policyName = 'DemoS3AccessPolicy-' + Date.now();
  let policyArn: string;

  try {
    // 1. Create a managed policy for S3 access
    const policy = await createManagedPolicy(
      policyName,
      PolicyTemplates.s3ReadOnly('my-demo-bucket'),
      'Demo S3 read-only access policy'
    );
    policyArn = policy?.Arn!;

    // 2. Get policy details
    await getPolicyDetails(policyArn);

    // 3. Get the policy document
    await getPolicyVersion(policyArn, 'v1');

    // 4. Create a new version with enhanced permissions
    await createPolicyVersion(
      policyArn,
      PolicyTemplates.s3FullAccessWithEncryption('my-demo-bucket'),
      true
    );

    // 5. List all versions
    await listPolicyVersions(policyArn);

    // 6. Get the new policy document
    await getPolicyDetails(policyArn);

    // 7. Clean up
    await deletePolicy(policyArn);

    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample().catch(console.error);
}

// Export functions and templates
export {
  PolicyTemplates,
  createManagedPolicy,
  getPolicyDetails,
  getPolicyVersion,
  createPolicyVersion,
  listPolicyVersions,
  simulatePolicy,
  createInlinePolicy,
  deletePolicy,
};
