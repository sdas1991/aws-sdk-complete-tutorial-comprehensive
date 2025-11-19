/**
 * S3 Example 01: Basic Upload Operations
 *
 * This example demonstrates:
 * - Uploading files to S3
 * - Setting metadata and tags
 * - Different content types
 * - Upload verification
 * - Error handling
 *
 * @complexity: ⭐ Basic
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectAttributesCommand,
} from '@aws-sdk/client-s3';
import { readFileSync, createReadStream } from 'fs';
import { createHash } from 'crypto';

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Upload a file from buffer
 */
async function uploadFromBuffer(
  bucket: string,
  key: string,
  content: Buffer,
  contentType: string = 'application/octet-stream'
) {
  console.log(`\n📤 Uploading ${key} to ${bucket}...`);

  try {
    // Calculate MD5 checksum for integrity verification
    const md5Hash = createHash('md5').update(content).digest('base64');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ContentType: contentType,
      ContentMD5: md5Hash,
      Metadata: {
        uploadedBy: 'sdk-tutorial',
        uploadedAt: new Date().toISOString(),
        originalSize: content.length.toString(),
      },
      Tags: 'Environment=development&Project=tutorial',
    });

    const response = await client.send(command);

    console.log('✅ Upload successful:');
    console.log(`   ETag: ${response.ETag}`);
    console.log(`   Version ID: ${response.VersionId || 'N/A'}`);
    console.log(`   Server-Side Encryption: ${response.ServerSideEncryption || 'None'}`);

    return response;
  } catch (error: any) {
    if (error.name === 'NoSuchBucket') {
      console.error('❌ Bucket does not exist');
    } else if (error.name === 'AccessDenied') {
      console.error('❌ Access denied - check IAM permissions');
    } else {
      console.error('❌ Upload failed:', error.message);
    }
    throw error;
  }
}

/**
 * Upload a text string
 */
async function uploadText(bucket: string, key: string, text: string) {
  console.log(`\n📝 Uploading text to ${key}...`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: text,
      ContentType: 'text/plain; charset=utf-8',
      CacheControl: 'max-age=3600',
    });

    const response = await client.send(command);
    console.log('✅ Text uploaded successfully');

    return response;
  } catch (error: any) {
    console.error('❌ Error uploading text:', error.message);
    throw error;
  }
}

/**
 * Upload JSON data
 */
async function uploadJSON(bucket: string, key: string, data: any) {
  console.log(`\n📊 Uploading JSON to ${key}...`);

  try {
    const jsonString = JSON.stringify(data, null, 2);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: jsonString,
      ContentType: 'application/json',
      Metadata: {
        recordCount: Array.isArray(data) ? data.length.toString() : '1',
      },
    });

    const response = await client.send(command);
    console.log('✅ JSON uploaded successfully');
    console.log(`   Size: ${jsonString.length} bytes`);

    return response;
  } catch (error: any) {
    console.error('❌ Error uploading JSON:', error.message);
    throw error;
  }
}

/**
 * Upload with server-side encryption
 */
async function uploadWithEncryption(
  bucket: string,
  key: string,
  content: Buffer,
  encryptionType: 'AES256' | 'aws:kms' = 'AES256',
  kmsKeyId?: string
) {
  console.log(`\n🔒 Uploading with ${encryptionType} encryption...`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      ServerSideEncryption: encryptionType,
      ...(encryptionType === 'aws:kms' && kmsKeyId
        ? { SSEKMSKeyId: kmsKeyId }
        : {}),
    });

    const response = await client.send(command);

    console.log('✅ Encrypted upload successful:');
    console.log(`   Encryption: ${response.ServerSideEncryption}`);
    console.log(`   KMS Key ID: ${response.SSEKMSKeyId || 'N/A'}`);

    return response;
  } catch (error: any) {
    console.error('❌ Encrypted upload failed:', error.message);
    throw error;
  }
}

/**
 * Upload with storage class specification
 */
async function uploadWithStorageClass(
  bucket: string,
  key: string,
  content: Buffer,
  storageClass: 'STANDARD' | 'STANDARD_IA' | 'INTELLIGENT_TIERING' | 'GLACIER'
) {
  console.log(`\n💾 Uploading with ${storageClass} storage class...`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      StorageClass: storageClass,
    });

    const response = await client.send(command);
    console.log('✅ Upload successful with storage class:', storageClass);

    return response;
  } catch (error: any) {
    console.error('❌ Upload with storage class failed:', error.message);
    throw error;
  }
}

/**
 * Upload a file from disk
 */
async function uploadFile(bucket: string, key: string, filePath: string) {
  console.log(`\n📁 Uploading file from ${filePath}...`);

  try {
    const fileContent = readFileSync(filePath);

    // Detect content type based on file extension
    const contentType = getContentType(filePath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    });

    const response = await client.send(command);

    console.log('✅ File uploaded successfully');
    console.log(`   File: ${filePath}`);
    console.log(`   Size: ${fileContent.length} bytes`);
    console.log(`   Content-Type: ${contentType}`);

    return response;
  } catch (error: any) {
    console.error('❌ File upload failed:', error.message);
    throw error;
  }
}

/**
 * Verify upload by checking object metadata
 */
async function verifyUpload(bucket: string, key: string) {
  console.log(`\n🔍 Verifying upload: ${key}...`);

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await client.send(command);

    console.log('✅ Object exists:');
    console.log(`   Content-Type: ${response.ContentType}`);
    console.log(`   Content-Length: ${response.ContentLength} bytes`);
    console.log(`   Last Modified: ${response.LastModified}`);
    console.log(`   ETag: ${response.ETag}`);
    console.log(`   Storage Class: ${response.StorageClass || 'STANDARD'}`);

    if (response.Metadata) {
      console.log('   Metadata:');
      for (const [key, value] of Object.entries(response.Metadata)) {
        console.log(`      ${key}: ${value}`);
      }
    }

    return response;
  } catch (error: any) {
    if (error.name === 'NotFound') {
      console.log('⚠️  Object not found');
      return null;
    } else {
      console.error('❌ Verification failed:', error.message);
      throw error;
    }
  }
}

/**
 * Upload with custom metadata and tags
 */
async function uploadWithMetadataAndTags(
  bucket: string,
  key: string,
  content: Buffer,
  metadata: Record<string, string>,
  tags: Record<string, string>
) {
  console.log(`\n🏷️  Uploading with metadata and tags...`);

  try {
    // Convert tags object to tag string
    const tagString = Object.entries(tags)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: content,
      Metadata: metadata,
      Tagging: tagString,
    });

    const response = await client.send(command);

    console.log('✅ Upload with metadata and tags successful');
    console.log('   Metadata:', metadata);
    console.log('   Tags:', tags);

    return response;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

/**
 * Helper: Detect content type from file extension
 */
function getContentType(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    txt: 'text/plain',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
  };

  return contentTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Complete example workflow
 */
async function runExample(): Promise<void> {
  console.log('🚀 S3 Basic Upload Example');
  console.log('===========================\n');

  // Use environment variable or default bucket name
  const bucket = process.env.S3_BUCKET_NAME || 'your-bucket-name';
  const prefix = 'tutorials/basic-upload/';

  try {
    // 1. Upload text
    await uploadText(bucket, `${prefix}sample.txt`, 'Hello, S3!');

    // 2. Upload JSON
    const jsonData = {
      users: [
        { id: 1, name: 'Alice', role: 'admin' },
        { id: 2, name: 'Bob', role: 'user' },
      ],
    };
    await uploadJSON(bucket, `${prefix}data.json`, jsonData);

    // 3. Upload with encryption
    const sensitiveData = Buffer.from('Sensitive information');
    await uploadWithEncryption(bucket, `${prefix}secure.txt`, sensitiveData);

    // 4. Upload with metadata and tags
    const fileContent = Buffer.from('File with metadata and tags');
    await uploadWithMetadataAndTags(
      bucket,
      `${prefix}tagged.txt`,
      fileContent,
      {
        author: 'tutorial',
        version: '1.0',
        description: 'Example file',
      },
      {
        Environment: 'development',
        Project: 's3-tutorial',
        CostCenter: 'engineering',
      }
    );

    // 5. Upload to Intelligent Tiering
    await uploadWithStorageClass(
      bucket,
      `${prefix}optimized.txt`,
      Buffer.from('Cost-optimized storage'),
      'INTELLIGENT_TIERING'
    );

    // 6. Verify all uploads
    console.log('\n🔍 Verifying all uploads...');
    await verifyUpload(bucket, `${prefix}sample.txt`);
    await verifyUpload(bucket, `${prefix}data.json`);
    await verifyUpload(bucket, `${prefix}secure.txt`);

    console.log('\n✅ All uploads completed successfully!');
    console.log(`\n📍 Uploaded to: s3://${bucket}/${prefix}`);
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
  uploadFromBuffer,
  uploadText,
  uploadJSON,
  uploadWithEncryption,
  uploadWithStorageClass,
  uploadFile,
  verifyUpload,
  uploadWithMetadataAndTags,
  getContentType,
};
