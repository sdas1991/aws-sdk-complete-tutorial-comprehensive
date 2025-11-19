/**
 * S3 Example 05: Multipart Upload
 *
 * This example demonstrates:
 * - Uploading large files in parts
 * - Progress tracking
 * - Parallel part uploads
 * - Resuming failed uploads
 * - Using @aws-sdk/lib-storage Upload helper
 * - Manual multipart upload management
 *
 * @complexity: ⭐⭐ Intermediate
 */

import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommand,
  ListPartsCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createReadStream, statSync, readFileSync } from 'fs';

const client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

/**
 * Simple multipart upload using Upload helper (recommended)
 */
async function uploadLargeFileSimple(
  bucket: string,
  key: string,
  filePath: string,
  partSize: number = 5 * 1024 * 1024 // 5 MB default
) {
  console.log(`\n📤 Uploading large file: ${filePath}...`);

  try {
    const fileStream = createReadStream(filePath);
    const fileStats = statSync(filePath);

    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileStream,
        ContentType: 'application/octet-stream',
      },
      // Configure multipart upload
      partSize, // Size of each part (5MB - 5GB)
      queueSize: 4, // Number of concurrent part uploads
      leavePartsOnError: false, // Clean up on failure
    });

    // Track progress
    upload.on('httpUploadProgress', (progress) => {
      const percent = progress.total
        ? Math.round((progress.loaded! / progress.total) * 100)
        : 0;

      console.log(
        `   Progress: ${formatBytes(progress.loaded!)}/${formatBytes(progress.total!)} (${percent}%)`
      );
    });

    const result = await upload.done();

    console.log('✅ Upload complete:');
    console.log(`   Location: ${result.Location}`);
    console.log(`   ETag: ${result.ETag}`);
    console.log(`   File size: ${formatBytes(fileStats.size)}`);
    console.log(`   Parts uploaded: ${Math.ceil(fileStats.size / partSize)}`);

    return result;
  } catch (error: any) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

/**
 * Manual multipart upload with fine-grained control
 */
async function uploadLargeFileManual(
  bucket: string,
  key: string,
  filePath: string,
  partSize: number = 5 * 1024 * 1024
) {
  console.log(`\n📤 Manual multipart upload: ${filePath}...`);

  const fileStats = statSync(filePath);
  const fileBuffer = readFileSync(filePath);
  const totalParts = Math.ceil(fileStats.size / partSize);

  console.log(`   File size: ${formatBytes(fileStats.size)}`);
  console.log(`   Part size: ${formatBytes(partSize)}`);
  console.log(`   Total parts: ${totalParts}`);

  let uploadId: string;

  try {
    // 1. Initiate multipart upload
    const initCommand = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: 'application/octet-stream',
      Metadata: {
        originalSize: fileStats.size.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    const initResponse = await client.send(initCommand);
    uploadId = initResponse.UploadId!;

    console.log(`\n✅ Multipart upload initiated`);
    console.log(`   Upload ID: ${uploadId}`);

    // 2. Upload parts
    const uploadedParts: { ETag: string; PartNumber: number }[] = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, fileStats.size);
      const partBuffer = fileBuffer.slice(start, end);

      console.log(
        `\n   Uploading part ${partNumber}/${totalParts} (${formatBytes(partBuffer.length)})...`
      );

      const uploadPartCommand = new UploadPartCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: partBuffer,
      });

      const uploadPartResponse = await client.send(uploadPartCommand);

      uploadedParts.push({
        ETag: uploadPartResponse.ETag!,
        PartNumber: partNumber,
      });

      const progress = Math.round((partNumber / totalParts) * 100);
      console.log(`   ✓ Part ${partNumber} uploaded (${progress}% complete)`);
    }

    // 3. Complete multipart upload
    console.log(`\n🔄 Completing multipart upload...`);

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: uploadedParts,
      },
    });

    const completeResponse = await client.send(completeCommand);

    console.log('✅ Multipart upload complete:');
    console.log(`   Location: ${completeResponse.Location}`);
    console.log(`   ETag: ${completeResponse.ETag}`);

    return completeResponse;
  } catch (error: any) {
    console.error('❌ Multipart upload failed:', error.message);

    // Abort the upload if it was initiated
    if (uploadId!) {
      console.log('🗑️  Aborting multipart upload...');
      await abortMultipartUpload(bucket, key, uploadId);
    }

    throw error;
  }
}

/**
 * Upload with parallel part uploads for maximum speed
 */
async function uploadWithParallelParts(
  bucket: string,
  key: string,
  filePath: string,
  partSize: number = 10 * 1024 * 1024, // 10 MB
  concurrency: number = 10 // Upload 10 parts simultaneously
) {
  console.log(`\n🚀 Parallel multipart upload: ${filePath}...`);
  console.log(`   Concurrency: ${concurrency} parts`);

  const fileStats = statSync(filePath);
  const fileBuffer = readFileSync(filePath);
  const totalParts = Math.ceil(fileStats.size / partSize);

  let uploadId: string;

  try {
    // 1. Initiate upload
    const initResponse = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    uploadId = initResponse.UploadId!;

    console.log(`✅ Upload initiated: ${uploadId}`);

    // 2. Create upload tasks for all parts
    const uploadTasks: Promise<{ ETag: string; PartNumber: number }>[] = [];

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, fileStats.size);
      const partBuffer = fileBuffer.slice(start, end);

      // Create upload promise
      const uploadPromise = client
        .send(
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            Body: partBuffer,
          })
        )
        .then((response) => {
          console.log(`   ✓ Part ${partNumber}/${totalParts} uploaded`);
          return {
            ETag: response.ETag!,
            PartNumber: partNumber,
          };
        });

      uploadTasks.push(uploadPromise);

      // Control concurrency - wait if we've reached the limit
      if (uploadTasks.length >= concurrency) {
        await Promise.race(uploadTasks);
      }
    }

    // 3. Wait for all uploads to complete
    console.log(`\n⏳ Waiting for all parts to upload...`);
    const uploadedParts = await Promise.all(uploadTasks);

    // 4. Complete upload
    const completeResponse = await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      })
    );

    console.log('\n✅ Parallel upload complete!');
    console.log(`   Total parts: ${totalParts}`);
    console.log(`   Location: ${completeResponse.Location}`);

    return completeResponse;
  } catch (error: any) {
    console.error('❌ Parallel upload failed:', error.message);
    if (uploadId!) {
      await abortMultipartUpload(bucket, key, uploadId);
    }
    throw error;
  }
}

/**
 * List incomplete multipart uploads
 */
async function listIncompleteUploads(bucket: string) {
  console.log(`\n📋 Listing incomplete multipart uploads for ${bucket}...`);

  try {
    const command = new ListMultipartUploadsCommand({
      Bucket: bucket,
    });

    const response = await client.send(command);

    if (response.Uploads && response.Uploads.length > 0) {
      console.log(`✅ Found ${response.Uploads.length} incomplete uploads:`);

      for (const upload of response.Uploads) {
        console.log(`\n   Upload ID: ${upload.UploadId}`);
        console.log(`   Key: ${upload.Key}`);
        console.log(`   Initiated: ${upload.Initiated}`);
        console.log(`   Initiator: ${upload.Initiator?.DisplayName}`);
      }

      return response.Uploads;
    } else {
      console.log('✅ No incomplete uploads found');
      return [];
    }
  } catch (error: any) {
    console.error('❌ Error listing uploads:', error.message);
    throw error;
  }
}

/**
 * Resume incomplete multipart upload
 */
async function resumeMultipartUpload(
  bucket: string,
  key: string,
  uploadId: string,
  filePath: string,
  partSize: number = 5 * 1024 * 1024
) {
  console.log(`\n🔄 Resuming multipart upload...`);
  console.log(`   Upload ID: ${uploadId}`);

  try {
    // 1. List already uploaded parts
    const listPartsResponse = await client.send(
      new ListPartsCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      })
    );

    const uploadedParts = listPartsResponse.Parts || [];
    const uploadedPartNumbers = new Set(uploadedParts.map((p) => p.PartNumber));

    console.log(`✅ Found ${uploadedParts.length} already uploaded parts`);

    // 2. Upload missing parts
    const fileStats = statSync(filePath);
    const fileBuffer = readFileSync(filePath);
    const totalParts = Math.ceil(fileStats.size / partSize);

    const allParts: { ETag: string; PartNumber: number }[] = uploadedParts.map((p) => ({
      ETag: p.ETag!,
      PartNumber: p.PartNumber!,
    }));

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      if (uploadedPartNumbers.has(partNumber)) {
        console.log(`   ↷ Part ${partNumber} already uploaded, skipping`);
        continue;
      }

      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, fileStats.size);
      const partBuffer = fileBuffer.slice(start, end);

      console.log(`   Uploading part ${partNumber}/${totalParts}...`);

      const uploadResponse = await client.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: partBuffer,
        })
      );

      allParts.push({
        ETag: uploadResponse.ETag!,
        PartNumber: partNumber,
      });

      console.log(`   ✓ Part ${partNumber} uploaded`);
    }

    // 3. Complete upload
    const completeResponse = await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: allParts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      })
    );

    console.log('\n✅ Resume and complete successful!');
    return completeResponse;
  } catch (error: any) {
    console.error('❌ Resume failed:', error.message);
    throw error;
  }
}

/**
 * Abort a multipart upload
 */
async function abortMultipartUpload(bucket: string, key: string, uploadId: string) {
  console.log(`\n🗑️  Aborting multipart upload: ${uploadId}...`);

  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });

    await client.send(command);
    console.log('✅ Multipart upload aborted');
  } catch (error: any) {
    console.error('❌ Abort failed:', error.message);
    throw error;
  }
}

/**
 * Helper: Format bytes to human-readable size
 */
function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Complete example workflow
 */
async function runExample(): Promise<void> {
  console.log('🚀 S3 Multipart Upload Example');
  console.log('================================\n');

  const bucket = process.env.S3_BUCKET_NAME || 'your-bucket-name';

  try {
    // Note: For this example to work, you need a large file
    // Create a test file or use an existing large file

    console.log('💡 Tip: Multipart upload is recommended for files > 100 MB');
    console.log('   - Enables parallel uploads for better performance');
    console.log('   - Supports resuming failed uploads');
    console.log('   - Required for files > 5 GB');

    // Example 1: Simple multipart upload with Upload helper
    // await uploadLargeFileSimple(bucket, 'large-files/video.mp4', './large-file.mp4');

    // Example 2: Manual multipart upload
    // await uploadLargeFileManual(bucket, 'large-files/dataset.zip', './dataset.zip', 10 * 1024 * 1024);

    // Example 3: List incomplete uploads
    await listIncompleteUploads(bucket);

    console.log('\n✅ Example completed!');
    console.log('\n📝 Note: Uncomment the upload examples and provide actual file paths to test.');
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
  uploadLargeFileSimple,
  uploadLargeFileManual,
  uploadWithParallelParts,
  listIncompleteUploads,
  resumeMultipartUpload,
  abortMultipartUpload,
  formatBytes,
};
