import { S3Client } from '@aws-sdk/client-s3';
import config from './index.js';

export const r2Client = new S3Client({
  endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey
  }
});

export const bucketName = config.r2.bucketName;
