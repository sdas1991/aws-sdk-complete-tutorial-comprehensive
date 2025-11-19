/**
 * IAM Example 01: Basic User Management
 *
 * This example demonstrates:
 * - Creating IAM users
 * - Listing users with pagination
 * - Getting user details
 * - Updating user details
 * - Deleting users
 * - Adding tags to users
 * - Error handling and retries
 *
 * @complexity: ⭐ Basic
 */

import {
  IAMClient,
  CreateUserCommand,
  ListUsersCommand,
  GetUserCommand,
  DeleteUserCommand,
  UpdateUserCommand,
  TagUserCommand,
  UntagUserCommand,
  ListUserTagsCommand,
} from '@aws-sdk/client-iam';

// Initialize IAM client with best practices
const client = new IAMClient({
  region: 'us-east-1', // IAM is global, but region is required
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Create a new IAM user with tags
 */
async function createUser(userName: string, tags?: { key: string; value: string }[]) {
  console.log(`\n📝 Creating user: ${userName}...`);

  try {
    const command = new CreateUserCommand({
      UserName: userName,
      Tags: tags?.map((tag) => ({ Key: tag.key, Value: tag.value })),
      Path: '/engineers/', // Organize users with paths
    });

    const response = await client.send(command);

    console.log('✅ User created successfully:');
    console.log(`   User ARN: ${response.User?.Arn}`);
    console.log(`   User ID: ${response.User?.UserId}`);
    console.log(`   Created: ${response.User?.CreateDate}`);

    return response.User;
  } catch (error: any) {
    if (error.name === 'EntityAlreadyExistsException') {
      console.log('⚠️  User already exists');
      // Get existing user instead
      return getUserDetails(userName);
    } else if (error.name === 'LimitExceededException') {
      console.error('❌ IAM user limit exceeded (max 5,000 per account)');
      throw error;
    } else if (error.name === 'InvalidInputException') {
      console.error('❌ Invalid user name:', error.message);
      throw error;
    } else {
      console.error('❌ Error creating user:', error.message);
      throw error;
    }
  }
}

/**
 * List all IAM users with pagination
 */
async function listAllUsers(): Promise<void> {
  console.log('\n📋 Listing all IAM users...');

  try {
    let marker: string | undefined;
    let totalUsers = 0;

    do {
      const command = new ListUsersCommand({
        Marker: marker,
        MaxItems: 100, // Max items per page
      });

      const response = await client.send(command);

      if (response.Users) {
        for (const user of response.Users) {
          totalUsers++;
          console.log(`   ${totalUsers}. ${user.UserName}`);
          console.log(`      ARN: ${user.Arn}`);
          console.log(`      Created: ${user.CreateDate?.toISOString()}`);
          console.log(`      Path: ${user.Path}`);
        }
      }

      marker = response.Marker;
    } while (marker);

    console.log(`\n✅ Total users: ${totalUsers}`);
  } catch (error: any) {
    console.error('❌ Error listing users:', error.message);
    throw error;
  }
}

/**
 * Get detailed information about a specific user
 */
async function getUserDetails(userName: string) {
  console.log(`\n🔍 Getting details for user: ${userName}...`);

  try {
    const command = new GetUserCommand({
      UserName: userName,
    });

    const response = await client.send(command);
    const user = response.User;

    console.log('✅ User details:');
    console.log(`   User Name: ${user?.UserName}`);
    console.log(`   User ARN: ${user?.Arn}`);
    console.log(`   User ID: ${user?.UserId}`);
    console.log(`   Path: ${user?.Path}`);
    console.log(`   Created: ${user?.CreateDate?.toISOString()}`);
    console.log(`   Password Last Used: ${user?.PasswordLastUsed?.toISOString() || 'Never'}`);

    return user;
  } catch (error: any) {
    if (error.name === 'NoSuchEntityException') {
      console.log('⚠️  User does not exist');
      return null;
    } else {
      console.error('❌ Error getting user details:', error.message);
      throw error;
    }
  }
}

/**
 * Add tags to an IAM user
 */
async function tagUser(userName: string, tags: { key: string; value: string }[]): Promise<void> {
  console.log(`\n🏷️  Adding tags to user: ${userName}...`);

  try {
    const command = new TagUserCommand({
      UserName: userName,
      Tags: tags.map((tag) => ({ Key: tag.key, Value: tag.value })),
    });

    await client.send(command);
    console.log('✅ Tags added successfully');
  } catch (error: any) {
    console.error('❌ Error adding tags:', error.message);
    throw error;
  }
}

/**
 * List tags for a user
 */
async function listUserTags(userName: string): Promise<void> {
  console.log(`\n🏷️  Listing tags for user: ${userName}...`);

  try {
    const command = new ListUserTagsCommand({
      UserName: userName,
    });

    const response = await client.send(command);

    if (response.Tags && response.Tags.length > 0) {
      console.log('✅ Tags:');
      for (const tag of response.Tags) {
        console.log(`   ${tag.Key}: ${tag.Value}`);
      }
    } else {
      console.log('   No tags found');
    }
  } catch (error: any) {
    console.error('❌ Error listing tags:', error.message);
    throw error;
  }
}

/**
 * Remove tags from a user
 */
async function untagUser(userName: string, tagKeys: string[]): Promise<void> {
  console.log(`\n🏷️  Removing tags from user: ${userName}...`);

  try {
    const command = new UntagUserCommand({
      UserName: userName,
      TagKeys: tagKeys,
    });

    await client.send(command);
    console.log('✅ Tags removed successfully');
  } catch (error: any) {
    console.error('❌ Error removing tags:', error.message);
    throw error;
  }
}

/**
 * Update user path (move user to different organizational path)
 */
async function updateUserPath(userName: string, newPath: string): Promise<void> {
  console.log(`\n📝 Updating user path: ${userName} -> ${newPath}...`);

  try {
    const command = new UpdateUserCommand({
      UserName: userName,
      NewPath: newPath,
    });

    await client.send(command);
    console.log('✅ User path updated successfully');
  } catch (error: any) {
    console.error('❌ Error updating user path:', error.message);
    throw error;
  }
}

/**
 * Delete an IAM user
 * Note: User must have no attached policies, access keys, MFA devices, etc.
 */
async function deleteUser(userName: string): Promise<void> {
  console.log(`\n🗑️  Deleting user: ${userName}...`);

  try {
    const command = new DeleteUserCommand({
      UserName: userName,
    });

    await client.send(command);
    console.log('✅ User deleted successfully');
  } catch (error: any) {
    if (error.name === 'NoSuchEntityException') {
      console.log('⚠️  User does not exist');
    } else if (error.name === 'DeleteConflictException') {
      console.error(
        '❌ Cannot delete user: User must not have any attached policies, access keys, MFA devices, or other dependencies'
      );
      throw error;
    } else {
      console.error('❌ Error deleting user:', error.message);
      throw error;
    }
  }
}

/**
 * Complete example workflow
 */
async function runExample(): Promise<void> {
  console.log('🚀 IAM User Management Example');
  console.log('================================\n');

  const testUserName = 'demo-engineer-' + Date.now();

  try {
    // 1. Create a new user with tags
    await createUser(testUserName, [
      { key: 'Environment', value: 'development' },
      { key: 'Team', value: 'platform' },
      { key: 'CostCenter', value: 'engineering' },
    ]);

    // 2. Get user details
    await getUserDetails(testUserName);

    // 3. List user tags
    await listUserTags(testUserName);

    // 4. Add additional tags
    await tagUser(testUserName, [
      { key: 'Project', value: 'microservices' },
      { key: 'Owner', value: 'john.doe@example.com' },
    ]);

    // 5. List updated tags
    await listUserTags(testUserName);

    // 6. Update user path
    await updateUserPath(testUserName, '/contractors/');

    // 7. Verify update
    await getUserDetails(testUserName);

    // 8. Remove some tags
    await untagUser(testUserName, ['Project']);

    // 9. List all users (showing pagination)
    await listAllUsers();

    // 10. Clean up - delete test user
    await deleteUser(testUserName);

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

// Export functions for use in other modules
export {
  createUser,
  listAllUsers,
  getUserDetails,
  tagUser,
  listUserTags,
  untagUser,
  updateUserPath,
  deleteUser,
};
