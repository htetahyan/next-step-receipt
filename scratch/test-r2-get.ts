import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function testR2() {
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });

  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;
  console.log('Testing R2 Bucket access for:', bucketName);

  // Let's test generating a signed GET URL for an object key or reading via S3Client
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: 'test-file-key',
    });
    const presignedGetUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    console.log('Successfully generated presigned GET URL template:', presignedGetUrl);
  } catch (err) {
    console.error('Error generating presigned GET URL:', err);
  }
}

testR2();
