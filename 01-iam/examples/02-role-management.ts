/**
 * IAM Example 02: Role Management
 *
 * This example demonstrates:
 * - Creating IAM roles with trust policies
 * - Common trust policy patterns (Lambda, EC2, Cross-account)
 * - Updating trust policies
 * - Attaching and detaching policies
 * - Listing roles
 * - Deleting roles
 *
 * @complexity: ⭐ Basic
 */

import {
  IAMClient,
  CreateRoleCommand,
  GetRoleCommand,
  ListRolesCommand,
  DeleteRoleCommand,
  UpdateAssumeRolePolicyCommand,
  AttachRolePolicyCommand,
  DetachRolePolicyCommand,
  ListAttachedRolePoliciesCommand,
  TagRoleCommand,
} from '@aws-sdk/client-iam';

const client = new IAMClient({
  region: 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Trust policy templates for common scenarios
 */
const TrustPolicyTemplates = {
  // Lambda function execution role
  lambda: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      },
    ],
  },

  // EC2 instance role
  ec2: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'ec2.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      },
    ],
  },

  // ECS task role
  ecs: {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Service: 'ecs-tasks.amazonaws.com',
        },
        Action: 'sts:AssumeRole',
      },
    ],
  },

  // Cross-account access with external ID
  crossAccount: (trustedAccountId: string, externalId: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          AWS: `arn:aws:iam::${trustedAccountId}:root`,
        },
        Action: 'sts:AssumeRole',
        Condition: {
          StringEquals: {
            'sts:ExternalId': externalId,
          },
        },
      },
    ],
  }),

  // Federated user access (SAML)
  samlFederation: (samlProviderArn: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Federated: samlProviderArn,
        },
        Action: 'sts:AssumeRoleWithSAML',
        Condition: {
          StringEquals: {
            'SAML:aud': 'https://signin.aws.amazon.com/saml',
          },
        },
      },
    ],
  }),

  // Web identity federation (Cognito)
  webIdentity: (cognitoIdentityPoolId: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Federated: 'cognito-identity.amazonaws.com',
        },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': cognitoIdentityPoolId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
      },
    ],
  }),

  // GitHub Actions OIDC
  githubActions: (githubOrg: string, githubRepo: string) => ({
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: {
          Federated: 'arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com',
        },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${githubOrg}/${githubRepo}:*`,
          },
        },
      },
    ],
  }),
};

/**
 * Create an IAM role
 */
async function createRole(
  roleName: string,
  trustPolicy: any,
  description?: string,
  tags?: { key: string; value: string }[]
) {
  console.log(`\n📝 Creating role: ${roleName}...`);

  try {
    const command = new CreateRoleCommand({
      RoleName: roleName,
      AssumeRolePolicyDocument: JSON.stringify(trustPolicy),
      Description: description || `IAM role: ${roleName}`,
      Tags: tags?.map((tag) => ({ Key: tag.key, Value: tag.value })),
      MaxSessionDuration: 3600, // 1 hour (default), max 12 hours
    });

    const response = await client.send(command);

    console.log('✅ Role created successfully:');
    console.log(`   Role ARN: ${response.Role?.Arn}`);
    console.log(`   Role ID: ${response.Role?.RoleId}`);
    console.log(`   Created: ${response.Role?.CreateDate}`);

    return response.Role;
  } catch (error: any) {
    if (error.name === 'EntityAlreadyExistsException') {
      console.log('⚠️  Role already exists');
      return getRoleDetails(roleName);
    } else if (error.name === 'MalformedPolicyDocumentException') {
      console.error('❌ Invalid trust policy document');
      throw error;
    } else if (error.name === 'LimitExceededException') {
      console.error('❌ IAM role limit exceeded');
      throw error;
    } else {
      console.error('❌ Error creating role:', error.message);
      throw error;
    }
  }
}

/**
 * Get role details
 */
async function getRoleDetails(roleName: string) {
  console.log(`\n🔍 Getting details for role: ${roleName}...`);

  try {
    const command = new GetRoleCommand({
      RoleName: roleName,
    });

    const response = await client.send(command);
    const role = response.Role;

    console.log('✅ Role details:');
    console.log(`   Role Name: ${role?.RoleName}`);
    console.log(`   Role ARN: ${role?.Arn}`);
    console.log(`   Created: ${role?.CreateDate?.toISOString()}`);
    console.log(`   Max Session Duration: ${role?.MaxSessionDuration} seconds`);
    console.log(`   Description: ${role?.Description}`);
    console.log('\n   Trust Policy:');
    console.log(
      JSON.stringify(JSON.parse(decodeURIComponent(role?.AssumeRolePolicyDocument || '')), null, 2)
    );

    return role;
  } catch (error: any) {
    if (error.name === 'NoSuchEntityException') {
      console.log('⚠️  Role does not exist');
      return null;
    } else {
      console.error('❌ Error getting role details:', error.message);
      throw error;
    }
  }
}

/**
 * Update role trust policy
 */
async function updateTrustPolicy(roleName: string, newTrustPolicy: any): Promise<void> {
  console.log(`\n📝 Updating trust policy for role: ${roleName}...`);

  try {
    const command = new UpdateAssumeRolePolicyCommand({
      RoleName: roleName,
      PolicyDocument: JSON.stringify(newTrustPolicy),
    });

    await client.send(command);
    console.log('✅ Trust policy updated successfully');
  } catch (error: any) {
    if (error.name === 'MalformedPolicyDocumentException') {
      console.error('❌ Invalid trust policy document');
    }
    console.error('❌ Error updating trust policy:', error.message);
    throw error;
  }
}

/**
 * Attach a managed policy to a role
 */
async function attachPolicyToRole(roleName: string, policyArn: string): Promise<void> {
  console.log(`\n🔗 Attaching policy to role: ${roleName}...`);
  console.log(`   Policy ARN: ${policyArn}`);

  try {
    const command = new AttachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: policyArn,
    });

    await client.send(command);
    console.log('✅ Policy attached successfully');
  } catch (error: any) {
    if (error.name === 'NoSuchEntityException') {
      console.error('❌ Role or policy does not exist');
    } else if (error.name === 'LimitExceededException') {
      console.error('❌ Maximum number of attached policies exceeded (max 10)');
    }
    throw error;
  }
}

/**
 * List attached policies for a role
 */
async function listAttachedPolicies(roleName: string): Promise<void> {
  console.log(`\n📋 Listing attached policies for role: ${roleName}...`);

  try {
    const command = new ListAttachedRolePoliciesCommand({
      RoleName: roleName,
    });

    const response = await client.send(command);

    if (response.AttachedPolicies && response.AttachedPolicies.length > 0) {
      console.log('✅ Attached policies:');
      for (const policy of response.AttachedPolicies) {
        console.log(`   - ${policy.PolicyName}`);
        console.log(`     ARN: ${policy.PolicyArn}`);
      }
    } else {
      console.log('   No policies attached');
    }
  } catch (error: any) {
    console.error('❌ Error listing attached policies:', error.message);
    throw error;
  }
}

/**
 * Detach a policy from a role
 */
async function detachPolicyFromRole(roleName: string, policyArn: string): Promise<void> {
  console.log(`\n🔓 Detaching policy from role: ${roleName}...`);
  console.log(`   Policy ARN: ${policyArn}`);

  try {
    const command = new DetachRolePolicyCommand({
      RoleName: roleName,
      PolicyArn: policyArn,
    });

    await client.send(command);
    console.log('✅ Policy detached successfully');
  } catch (error: any) {
    console.error('❌ Error detaching policy:', error.message);
    throw error;
  }
}

/**
 * List all roles
 */
async function listAllRoles(): Promise<void> {
  console.log('\n📋 Listing all IAM roles...');

  try {
    let marker: string | undefined;
    let totalRoles = 0;

    do {
      const command = new ListRolesCommand({
        Marker: marker,
        MaxItems: 100,
      });

      const response = await client.send(command);

      if (response.Roles) {
        for (const role of response.Roles) {
          totalRoles++;
          console.log(`   ${totalRoles}. ${role.RoleName}`);
          console.log(`      ARN: ${role.Arn}`);
          console.log(`      Created: ${role.CreateDate?.toISOString()}`);
        }
      }

      marker = response.Marker;
    } while (marker);

    console.log(`\n✅ Total roles: ${totalRoles}`);
  } catch (error: any) {
    console.error('❌ Error listing roles:', error.message);
    throw error;
  }
}

/**
 * Delete a role
 * Note: Must detach all policies first
 */
async function deleteRole(roleName: string): Promise<void> {
  console.log(`\n🗑️  Deleting role: ${roleName}...`);

  try {
    const command = new DeleteRoleCommand({
      RoleName: roleName,
    });

    await client.send(command);
    console.log('✅ Role deleted successfully');
  } catch (error: any) {
    if (error.name === 'NoSuchEntityException') {
      console.log('⚠️  Role does not exist');
    } else if (error.name === 'DeleteConflictException') {
      console.error('❌ Cannot delete role: Must detach all policies first');
      throw error;
    } else {
      console.error('❌ Error deleting role:', error.message);
      throw error;
    }
  }
}

/**
 * Complete example workflow
 */
async function runExample(): Promise<void> {
  console.log('🚀 IAM Role Management Example');
  console.log('================================\n');

  const testRoleName = 'demo-lambda-role-' + Date.now();

  try {
    // 1. Create a Lambda execution role
    await createRole(
      testRoleName,
      TrustPolicyTemplates.lambda,
      'Demo Lambda execution role',
      [
        { key: 'Environment', value: 'development' },
        { key: 'Service', value: 'lambda' },
      ]
    );

    // 2. Get role details
    await getRoleDetails(testRoleName);

    // 3. Attach AWS managed policy for Lambda basic execution
    await attachPolicyToRole(
      testRoleName,
      'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
    );

    // 4. List attached policies
    await listAttachedPolicies(testRoleName);

    // 5. Update trust policy to allow both Lambda and Step Functions
    const combinedTrustPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: ['lambda.amazonaws.com', 'states.amazonaws.com'],
          },
          Action: 'sts:AssumeRole',
        },
      ],
    };
    await updateTrustPolicy(testRoleName, combinedTrustPolicy);

    // 6. Verify updated trust policy
    await getRoleDetails(testRoleName);

    // 7. Clean up - detach policies and delete role
    await detachPolicyFromRole(
      testRoleName,
      'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'
    );
    await deleteRole(testRoleName);

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

// Export functions and templates for use in other modules
export {
  TrustPolicyTemplates,
  createRole,
  getRoleDetails,
  updateTrustPolicy,
  attachPolicyToRole,
  detachPolicyFromRole,
  listAttachedPolicies,
  listAllRoles,
  deleteRole,
};
