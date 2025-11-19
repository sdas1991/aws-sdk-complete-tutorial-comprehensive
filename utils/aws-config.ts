/**
 * AWS Configuration Utility
 *
 * Centralized AWS SDK configuration
 * Handles credentials, regions, and client setup
 */

import { fromEnv, fromIni } from '@aws-sdk/credential-providers';
import type { AwsCredentialIdentity } from '@aws-sdk/types';

export interface AWSConfig {
  region: string;
  credentials?: AwsCredentialIdentity;
  maxAttempts?: number;
  retryMode?: 'standard' | 'adaptive';
  endpoint?: string;
}

/**
 * Get AWS configuration from environment variables
 */
export function getAWSConfig(): AWSConfig {
  return {
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
    maxAttempts: parseInt(process.env.AWS_MAX_ATTEMPTS || '3'),
    retryMode: (process.env.AWS_RETRY_MODE as 'standard' | 'adaptive') || 'adaptive',
    // Use default credential provider chain
    // credentials: fromEnv(), // Can be uncommented if needed
  };
}

/**
 * Get credentials from environment variables
 */
export function getCredentialsFromEnv() {
  return fromEnv();
}

/**
 * Get credentials from AWS credentials file
 */
export function getCredentialsFromProfile(profile: string = 'default') {
  return fromIni({ profile });
}

/**
 * Validate AWS configuration
 */
export function validateConfig(config: AWSConfig): boolean {
  if (!config.region) {
    throw new Error('AWS region is required');
  }

  // Validate region format
  const regionPattern = /^[a-z]{2}-[a-z]+-\d{1}$/;
  if (!regionPattern.test(config.region)) {
    throw new Error(`Invalid AWS region format: ${config.region}`);
  }

  return true;
}

/**
 * Get AWS account ID
 */
export async function getAccountId(): Promise<string> {
  const { STSClient, GetCallerIdentityCommand } = await import('@aws-sdk/client-sts');

  const stsClient = new STSClient(getAWSConfig());
  const command = new GetCallerIdentityCommand({});
  const response = await stsClient.send(command);

  return response.Account!;
}

/**
 * Common client configurations
 */
export const ClientConfigs = {
  // Standard configuration
  standard: (): AWSConfig => ({
    ...getAWSConfig(),
    maxAttempts: 3,
    retryMode: 'standard',
  }),

  // Adaptive retry for better handling of throttling
  adaptive: (): AWSConfig => ({
    ...getAWSConfig(),
    maxAttempts: 5,
    retryMode: 'adaptive',
  }),

  // Development configuration (with localstack support)
  development: (): AWSConfig => ({
    region: 'us-east-1',
    maxAttempts: 3,
    retryMode: 'standard',
    endpoint: process.env.LOCALSTACK_ENDPOINT || undefined,
  }),
};
