/**
 * Common Helper Utilities
 *
 * Reusable utility functions for AWS SDK operations
 */

import { createHash } from 'crypto';

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Calculate MD5 hash
 */
export function calculateMD5(content: Buffer | string): string {
  return createHash('md5').update(content).digest('base64');
}

/**
 * Calculate SHA256 hash
 */
export function calculateSHA256(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Sleep/delay helper
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let attempt = 0;
  let lastError: Error;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      attempt++;

      if (attempt >= maxAttempts) {
        throw lastError;
      }

      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Parse ARN
 */
export interface ParsedARN {
  partition: string;
  service: string;
  region: string;
  accountId: string;
  resourceType?: string;
  resource: string;
}

export function parseARN(arn: string): ParsedARN {
  const parts = arn.split(':');

  if (parts.length < 6) {
    throw new Error(`Invalid ARN format: ${arn}`);
  }

  const resource = parts.slice(5).join(':');
  const resourceParts = resource.split('/');

  return {
    partition: parts[1],
    service: parts[2],
    region: parts[3],
    accountId: parts[4],
    resourceType: resourceParts.length > 1 ? resourceParts[0] : undefined,
    resource: resourceParts.length > 1 ? resourceParts.slice(1).join('/') : resource,
  };
}

/**
 * Build ARN
 */
export function buildARN(params: {
  service: string;
  region?: string;
  accountId?: string;
  resourceType?: string;
  resource: string;
  partition?: string;
}): string {
  const {
    partition = 'aws',
    service,
    region = '',
    accountId = '',
    resourceType,
    resource,
  } = params;

  const resourcePath = resourceType ? `${resourceType}/${resource}` : resource;

  return `arn:${partition}:${service}:${region}:${accountId}:${resourcePath}`;
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Get content type from file extension
 */
export function getContentType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  const contentTypes: Record<string, string> = {
    // Text
    txt: 'text/plain',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    xml: 'application/xml',
    csv: 'text/csv',

    // Images
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',

    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Archives
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    bz2: 'application/x-bzip2',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',

    // Media
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    webm: 'video/webm',

    // Fonts
    ttf: 'font/ttf',
    otf: 'font/otf',
    woff: 'font/woff',
    woff2: 'font/woff2',
  };

  return contentTypes[extension || ''] || 'application/octet-stream';
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string for use in AWS resource names
 */
export function sanitizeResourceName(name: string): string {
  // Replace invalid characters with hyphens
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Generate tags object from key-value pairs
 */
export function generateTags(tags: Record<string, string>): { Key: string; Value: string }[] {
  return Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
}

/**
 * Convert tags array to object
 */
export function tagsToObject(tags: { Key: string; Value: string }[]): Record<string, string> {
  return tags.reduce((acc, tag) => {
    acc[tag.Key] = tag.Value;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  options: {
    timeout?: number; // milliseconds
    interval?: number; // milliseconds
    timeoutMessage?: string;
  } = {}
): Promise<void> {
  const { timeout = 60000, interval = 1000, timeoutMessage = 'Timeout waiting for condition' } =
    options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }

    await sleep(interval);
  }

  throw new Error(timeoutMessage);
}

/**
 * Paginate through AWS SDK results
 */
export async function* paginateResults<T>(
  fetchPage: (marker?: string) => Promise<{ items: T[]; nextMarker?: string }>
): AsyncGenerator<T> {
  let marker: string | undefined;

  do {
    const page = await fetchPage(marker);

    for (const item of page.items) {
      yield item;
    }

    marker = page.nextMarker;
  } while (marker);
}
